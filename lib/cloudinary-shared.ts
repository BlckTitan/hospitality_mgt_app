export const CLOUDINARY_MAX_FILE_BYTES = 1 * 1024 * 1024; // 1 MB
/** Longest edge; larger images are rejected before upload. */
export const CLOUDINARY_MAX_DIMENSION_PX = 2000;
export const CLOUDINARY_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

export function formatCloudinaryBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CLOUDINARY_HELPER_TEXT = `JPEG, PNG, or WebP · max ${formatCloudinaryBytes(CLOUDINARY_MAX_FILE_BYTES)} · max ${CLOUDINARY_MAX_DIMENSION_PX}px`;
