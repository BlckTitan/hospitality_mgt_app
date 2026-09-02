import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  getClerkConvexAuthToken,
  isMissingClerkConvexJwtTemplate,
  logMissingClerkConvexJwtTemplate,
  MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR,
} from '../../../../lib/clerk-convex-auth';
import { convex, api } from '../../../../lib/convex-client';

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
      logMissingClerkConvexJwtTemplate('revoke-invite-api');
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

    const inviteResult = await convex.query(api.users.getPendingInvite, {
      inviteId: inviteId as any,
    });

    if (!inviteResult.success || !inviteResult.data) {
      return NextResponse.json(
        { error: inviteResult.message || 'Invite not found' },
        { status: 404 },
      );
    }

    const clerkInvitationId = inviteResult.data.clerkInvitationId;
    if (clerkInvitationId) {
      const client = await clerkClient();
      try {
        await client.invitations.revokeInvitation(clerkInvitationId);
      } catch (error) {
        console.error('Error revoking Clerk invitation:', error);
      }
    }

    const updateResult = await convex.mutation(api.users.updateInviteStatus, {
      inviteId: inviteId as any,
      status: 'revoked',
    });

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
