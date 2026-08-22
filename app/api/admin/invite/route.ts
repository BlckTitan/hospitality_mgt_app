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
      logMissingClerkConvexJwtTemplate('invite-api');
      return NextResponse.json(
        { error: MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { email, roleId, propertyId } = body;

    if (!email || !roleId || !propertyId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, roleId, propertyId' },
        { status: 400 },
      );
    }

    convex.setAuth(token);

    // Check if user already exists in Clerk before creating invitation
    const client = await clerkClient();
    try {
      const existingUsers = await client.users.getUserList({
        emailAddress: [email],
      });

      if (existingUsers.totalCount > 0) {
        return NextResponse.json(
          { error: 'This email is already registered. Please use a different email.' },
          { status: 400 },
        );
      }
    } catch (error) {
      console.error('Error checking for existing user:', error);
      // Continue with invitation creation if check fails
    }

    // Create Clerk invitation
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-up`,
      publicMetadata: {
        invitedBy: userId,
        roleId,
        propertyId,
      },
      ignoreExisting: false,
    });

    // Create pending invite record in Convex (this will verify permissions)
    const inviteResult = await convex.mutation(api.users.createPendingInvite, {
      email,
      roleId: roleId as any,
      propertyId: propertyId as any,
      clerkInvitationId: invitation.id,
    });

    if (!inviteResult.success) {
      return NextResponse.json(
        { error: inviteResult.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        invitationId: invitation.id,
        inviteId: inviteResult.inviteId,
        email: invitation.email_address,
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error('Error creating invitation:', error);

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

    // Handle other errors
    return NextResponse.json(
      { error: 'Failed to send invitation. Please try again.' },
      { status: 500 },
    );
  }
}