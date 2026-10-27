/** Short line for the roles list. Longer write-ups belong in `description`. */
export const ROLE_SUMMARY_MAX = 300;
export const ROLE_DESCRIPTION_MAX = 5000;

type RoleText = {
  summary?: string;
  description?: string;
};

/**
 * Legacy rows stored the short text in `description` and have no `summary`.
 * A summary of "" means it was cleared on purpose, so description stays the long field.
 */
export function roleSummaryText(role: RoleText): string | undefined {
  if (role.summary !== undefined) return role.summary || undefined;
  return role.description || undefined;
}

export function roleDescriptionText(role: RoleText): string | undefined {
  if (role.summary === undefined) return undefined;
  return role.description || undefined;
}

export function roleSummaryToStore(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function roleDescriptionToStore(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
