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
    const { clerkInvitationId } = body;

    if (!clerkInvitationId) {
      return NextResponse.json(
        { error: 'Missing required field: clerkInvitationId' },
        { status: 400 },
      );
    }

    convex.setAuth(token);

    // Verify user is authenticated
    try {
      const currentUser = await convex.query(api.users.current, {});
      if (!currentUser) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 },
      );
    }

    // Revoke the Clerk invitation
    const client = await clerkClient();
    try {
      await client.invitations.revokeInvitation(clerkInvitationId);
    } catch (error) {
      console.error('Error revoking Clerk invitation:', error);
      // Continue even if Clerk revocation fails - local status update will handle it
    }

    return NextResponse.json({
      success: true,
      message: 'Clerk invitation revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}