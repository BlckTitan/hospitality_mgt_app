/** Short line shown in the roles list. */
export const ROLE_SUMMARY_MAX = 300;

/** Sections of a role description, matching the staff job-description template. */
export const ROLE_REPORTS_TO_MAX = 300;
export const ROLE_DESCRIPTION_SUMMARY_MAX = 2000;
export const ROLE_RESPONSIBILITIES_MAX = 8000;
export const ROLE_QUALIFICATIONS_MAX = 4000;

export type RoleDescription = {
  reportsTo?: string;
  summary?: string;
  responsibilities?: string;
  qualifications?: string;
};

type RoleText = {
  summary?: string;
  description?: string | RoleDescription;
};

/**
 * Legacy rows stored the short text in `description` and have no `summary`.
 * A summary of "" means it was cleared on purpose, so description stays the long field.
 */
export function roleSummaryText(role: RoleText): string | undefined {
  if (role.summary !== undefined) return role.summary || undefined;
  return typeof role.description === "string" ? role.description || undefined : undefined;
}

export function roleDescriptionParts(role: RoleText): RoleDescription {
  const description = role.description;
  if (description && typeof description === "object") return description;
  if (typeof description === "string" && role.summary !== undefined && description.trim()) {
    return { summary: description };
  }
  return {};
}

export function roleSummaryToStore(value: string | undefined): string {
  return value?.trim() ?? "";
}

function trimmed(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

export function roleDescriptionToStore(value: RoleDescription | undefined): RoleDescription | undefined {
  if (!value) return undefined;
  const description: RoleDescription = {};
  const reportsTo = trimmed(value.reportsTo);
  const summary = trimmed(value.summary);
  const responsibilities = trimmed(value.responsibilities);
  const qualifications = trimmed(value.qualifications);
  if (reportsTo) description.reportsTo = reportsTo;
  if (summary) description.summary = summary;
  if (responsibilities) description.responsibilities = responsibilities;
  if (qualifications) description.qualifications = qualifications;
  return Object.keys(description).length ? description : undefined;
}

export function roleDescriptionError(description: RoleDescription | undefined): string | null {
  if (!description) return null;
  if ((description.reportsTo?.length ?? 0) > ROLE_REPORTS_TO_MAX) {
    return `Reports to must not exceed ${ROLE_REPORTS_TO_MAX} characters`;
  }
  if ((description.summary?.length ?? 0) > ROLE_DESCRIPTION_SUMMARY_MAX) {
    return `Description summary must not exceed ${ROLE_DESCRIPTION_SUMMARY_MAX} characters`;
  }
  if ((description.responsibilities?.length ?? 0) > ROLE_RESPONSIBILITIES_MAX) {
    return `Responsibilities must not exceed ${ROLE_RESPONSIBILITIES_MAX} characters`;
  }
  if ((description.qualifications?.length ?? 0) > ROLE_QUALIFICATIONS_MAX) {
    return `Qualifications must not exceed ${ROLE_QUALIFICATIONS_MAX} characters`;
  }
  return null;
}
