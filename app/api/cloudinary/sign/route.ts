import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSignedUploadParams } from '../../../../lib/cloudinary';
import { getClerkConvexAuthToken } from '../../../../lib/clerk-convex-auth';
import { getUserContext } from '../../../../lib/proxy-helpers';
import { createPermissionChecker } from '../../../../lib/permission-utils';

const UPLOAD_FOLDERS: Record<string, string[]> = {
  'properties/logos': ['properties.create', 'properties.update'],
  'properties/covers': ['properties.create', 'properties.update'],
  guests: ['reservations.create', 'reservations.update'],
  inventory: ['inventory.create', 'inventory.update'],
  'room-types': ['rooms.update', 'reservations.update'],
  staff: ['staff.create', 'staff.update'],
  beverages: ['fnb.create', 'fnb.update'],
};

const SETUP_FOLDERS = new Set(['properties/logos', 'properties/covers']);

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { folder?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const folder = typeof body.folder === 'string' ? body.folder.trim() : '';
    if (!UPLOAD_FOLDERS[folder] || folder.includes('..') || folder.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    const token = await getClerkConvexAuthToken(getToken);
    const userContext = await getUserContext(token);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checker = createPermissionChecker(userContext);
    const allowed =
      userContext.roles.length === 0
        ? SETUP_FOLDERS.has(folder)
        : UPLOAD_FOLDERS[folder].some((permission) => checker.hasGranularPermission(permission));
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const signed = createSignedUploadParams({ folder });

    return NextResponse.json({
      cloudName: signed.cloudName,
      apiKey: signed.apiKey,
      timestamp: signed.timestamp,
      folder: signed.folder,
      signature: signed.signature,
      allowedFormats: signed.allowedFormats,
      overwrite: signed.overwrite,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create upload signature';
    console.error('[cloudinary/sign]', message);
    return NextResponse.json(
      { error: 'Failed to create upload signature' },
      { status: message.includes('Missing environment') ? 503 : 500 },
    );
  }
}
