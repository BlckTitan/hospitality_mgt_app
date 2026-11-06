/** Hosted default shown when a staff profile has no uploaded photo. */
export const DEFAULT_STAFF_AVATAR_URL =
  "https://res.cloudinary.com/jkyr7zmk/image/upload/v1793710788/hospitality_manager/staff/wac8iobvffzx7rr3rizu.webp";

export function staffAvatarSrc(imageUrl?: string | null): string {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : DEFAULT_STAFF_AVATAR_URL;
}
