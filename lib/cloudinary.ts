import { createHash } from 'crypto';

export {
  CLOUDINARY_ALLOWED_MIME_TYPES,
  CLOUDINARY_MAX_FILE_BYTES,
  type CloudinaryUploadResult,
} from './cloudinary-shared';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getCloudinaryConfig() {
  return {
    cloudName: requireEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'),
    apiKey: requireEnv('CLOUDINARY_API_KEY'),
    apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || 'hospitality',
  };
}

/** Build a Cloudinary folder path under the configured root folder. */
export function resolveUploadFolder(subfolder?: string): string {
  const { folder: root } = getCloudinaryConfig();
  const extra = subfolder?.trim().replace(/^\/+|\/+$/g, '');
  if (!extra) return root;
  return `${root}/${extra}`;
}

/**
 * Sign upload parameters the way Cloudinary expects:
 * sorted `key=value` pairs joined by `&`, then SHA-1 with the API secret.
 * @see https://cloudinary.com/documentation/authentication_signatures
 */
export function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
}

export const CLOUDINARY_SIGNED_FORMATS = 'jpg,png,webp';

export function createSignedUploadParams(options?: { folder?: string }) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = resolveUploadFolder(options?.folder);

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
    allowed_formats: CLOUDINARY_SIGNED_FORMATS,
    overwrite: 0,
  };

  const signature = signCloudinaryParams(paramsToSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
    allowedFormats: CLOUDINARY_SIGNED_FORMATS,
    overwrite: 0,
  };
}
