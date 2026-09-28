import {
  CLOUDINARY_ALLOWED_MIME_TYPES,
  CLOUDINARY_HELPER_TEXT,
  CLOUDINARY_MAX_DIMENSION_PX,
  CLOUDINARY_MAX_FILE_BYTES,
  formatCloudinaryBytes,
  type CloudinaryUploadResult,
} from './cloudinary-shared';

export {
  CLOUDINARY_ALLOWED_MIME_TYPES,
  CLOUDINARY_HELPER_TEXT,
  CLOUDINARY_MAX_DIMENSION_PX,
  CLOUDINARY_MAX_FILE_BYTES,
  formatCloudinaryBytes,
  type CloudinaryUploadResult,
};

export type CloudinaryDeliveryOptions = {
  /** Longest edge in CSS pixels (will be doubled for retina). Default 80. */
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'fit' | 'thumb';
  /** Aspect ratio for fill/thumb, e.g. "1:1" or "16:9". */
  aspectRatio?: string;
};

/**
 * Rewrite a Cloudinary delivery URL with f_auto / q_auto and size transforms.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function cloudinaryDeliveryUrl(
  url: string | null | undefined,
  options: CloudinaryDeliveryOptions = {},
): string | null {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  const width = options.width ?? 80;
  const height = options.height;
  const crop = options.crop ?? (height ? 'fill' : 'limit');
  const dprWidth = Math.round(width * 2);

  const parts = [
    'f_auto',
    'q_auto',
    `c_${crop}`,
    `w_${dprWidth}`,
  ];
  if (height) {
    parts.push(`h_${Math.round(height * 2)}`);
  }
  if (options.aspectRatio) {
    parts.push(`ar_${options.aspectRatio}`);
  }

  const transform = parts.join(',');
  return url.replace('/upload/', `/upload/${transform}/`);
}
