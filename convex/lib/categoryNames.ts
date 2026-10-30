import { hasLetter } from "./fieldText";

export const CATEGORY_NAME_MAX_LENGTH = 40;

export function canonicalCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeCategoryName(name: string) {
  return canonicalCategoryName(name).toLowerCase();
}

export function categoryNameError(name: string): string | null {
  const trimmed = canonicalCategoryName(name);
  if (!trimmed) return "Name is required";
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    return `Name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer`;
  }
  if (!hasLetter(trimmed)) return "Name cannot be numbers only";
  return null;
}
