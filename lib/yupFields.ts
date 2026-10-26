import * as yup from "yup";
import { hasLetter, isPersonName, PHONE_PATTERN } from "../convex/lib/fieldText";

export function emptyStringToUndefined(value: unknown, originalValue: unknown) {
  if (typeof originalValue === "string" && originalValue.trim() === "") return undefined;
  return value;
}

export function recordName(
  label: string,
  options?: { required?: boolean; min?: number; max?: number; requiredMessage?: string },
) {
  const min = options?.min ?? 2;
  const max = options?.max ?? 200;
  const required = options?.required !== false;
  const minLabel = `${min} ${min === 1 ? "character" : "characters"}`;
  let schema = yup.string().trim();
  if (!required) schema = schema.transform(emptyStringToUndefined);
  if (required) schema = schema.min(min, `${label} must be at least ${minLabel}`);
  schema = schema
    .max(max, `${label} must not exceed ${max} characters`)
    .test("has-letter", `${label} cannot be numbers only`, (value) => hasLetter(value));
  if (required) return schema.required(options?.requiredMessage ?? `${label} is required`);
  return schema.optional().nullable();
}

export function personName(label: string, required = true) {
  let schema = yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .max(100, `${label} is too long`)
    .test("min-length", `${label} must be at least 2 characters`, (value) => !value || value.length >= 2)
    .test(
      "person-name",
      `${label} must contain only letters, spaces, hyphens, and apostrophes`,
      (value) => !value || isPersonName(value),
    );
  if (required) schema = schema.required(`${label} is required`);
  else schema = schema.optional();
  return schema;
}

export function optionalPhone(message = "Enter a valid phone number") {
  return yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .matches(PHONE_PATTERN, { message, excludeEmptyString: true })
    .optional();
}

export function optionalEmail(message = "Please enter a valid email address") {
  return yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .email(message)
    .max(254, "Email is too long")
    .optional();
}
