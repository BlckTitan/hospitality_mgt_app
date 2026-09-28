import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSignedUploadParams } from '../../../../lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { folder?: string; publicId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine — defaults apply
    }

    const folder = typeof body.folder === 'string' ? body.folder : undefined;
    const publicId = typeof body.publicId === 'string' ? body.publicId : undefined;

    // Prevent path escape outside the configured root folder
    if (folder && (folder.includes('..') || folder.startsWith('/'))) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    const signed = createSignedUploadParams({ folder, publicId });

    return NextResponse.json({
      cloudName: signed.cloudName,
      apiKey: signed.apiKey,
      timestamp: signed.timestamp,
      folder: signed.folder,
      signature: signed.signature,
      publicId: signed.publicId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create upload signature';
    console.error('[cloudinary/sign]', message);
    return NextResponse.json(
      { error: message.includes('Missing environment') ? message : 'Failed to create upload signature' },
      { status: message.includes('Missing environment') ? 503 : 500 },
    );
  }
}
