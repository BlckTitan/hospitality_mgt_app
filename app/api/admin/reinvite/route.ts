import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  getClerkConvexAuthToken,
  isMissingClerkConvexJwtTemplate,
  logMissingClerkConvexJwtTemplate,
  MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR,
} from '../../../../lib/clerk-convex-auth';
import { convex, api } from '../../../../lib/convex-client';
import { ClerkAPIResponseError } from '@clerk/backend/errors';

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const token = await getClerkConvexAuthToken(getToken);
    if (isMissingClerkConvexJwtTemplate(userId, token)) {
      logMissingClerkConvexJwtTemplate('reinvite-api');
      return NextResponse.json(
        { error: MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { inviteId } = body;

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Missing required field: inviteId' },
        { status: 400 },
      );
    }

    convex.setAuth(token);

    const reinviteResult = await convex.mutation(api.users.reinviteUser, {
      inviteId: inviteId as any,
    });

    if (!reinviteResult.success) {
      return NextResponse.json(
        { error: reinviteResult.message },
        { status: 400 },
      );
    }

    const previousStatus = reinviteResult.previousStatus ?? "expired";
    const previousClerkInvitationId = reinviteResult.previousClerkInvitationId;

    // Check if user is now registered (re-invite should not be allowed for registered users)
    const client = await clerkClient();
    try {
      const existingUsers = await client.users.getUserList({
        emailAddress: [reinviteResult.email],
      });

      if (existingUsers.totalCount > 0) {
        await convex.mutation(api.users.updateInviteStatus, {
          inviteId: inviteId as any,
          status: previousStatus,
          ...(previousClerkInvitationId
            ? { clerkInvitationId: previousClerkInvitationId }
            : {}),
        });
        return NextResponse.json(
          { error: 'This email is already registered. Cannot re-invite.' },
          { status: 400 },
        );
      }
    } catch (error) {
      console.error('Error checking for existing user during re-invite:', error);
      // Continue with re-invitation if check fails
    }

    // Create new Clerk invitation
    let clerkInvitationId = null;
    try {
      const invitation = await client.invitations.createInvitation({
        emailAddress: reinviteResult.email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-up`,
        publicMetadata: {
          invitedBy: userId,
          roleId: reinviteResult.roleId,
          propertyId: reinviteResult.propertyId,
          reinvited: true,
        },
        ignoreExisting: false,
      });
      clerkInvitationId = invitation.id;
    } catch (error) {
      console.error('Error creating Clerk invitation during re-invite:', error);

      // Rollback the Convex change to previous status
      await convex.mutation(api.users.updateInviteStatus, {
        inviteId: inviteId as any,
        status: previousStatus,
        ...(previousClerkInvitationId
          ? { clerkInvitationId: previousClerkInvitationId }
          : {}),
      });

      // Handle Clerk-specific errors
      if (error instanceof ClerkAPIResponseError) {
        const firstError = error.errors?.[0];
        if (firstError?.message) {
          return NextResponse.json(
            { error: firstError.message },
            { status: error.status || 400 },
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to create Clerk invitation. Please try again.' },
        { status: 500 },
      );
    }

    // Update the Convex record with the new Clerk invitation ID
    try {
      await convex.mutation(api.users.updateInviteClerkId, {
        inviteId: inviteId as any,
        clerkInvitationId: clerkInvitationId,
      });
    } catch (error) {
      console.error('Error updating Convex record with new Clerk invitation ID:', error);
      // Continue anyway, the invitation was created successfully
    }

    return NextResponse.json({
      success: true,
      data: {
        invitationId: clerkInvitationId,
        email: reinviteResult.email,
        message: 'Invitation re-sent successfully',
      },
    });
  } catch (error) {
    console.error('Error in re-invite process:', error);
    return NextResponse.json(
      { error: 'Failed to re-send invitation. Please try again.' },
      { status: 500 },
    );
  }
}