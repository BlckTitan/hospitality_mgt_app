/**
 * The admin invite route stores roleId and propertyId on the Clerk invitation's public
 * metadata, and Clerk copies it onto the user who accepts. Only the backend can write it.
 */
export function wasInvitedByAdmin(
  publicMetadata: Record<string, unknown> | null | undefined,
): boolean {
  return Boolean(publicMetadata?.roleId && publicMetadata?.propertyId);
}
