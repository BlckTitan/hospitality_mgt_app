import * as yup from "yup";
import { hasLetter } from "../../../../../convex/lib/fieldText";
import {
  ROLE_DESCRIPTION_SUMMARY_MAX,
  ROLE_QUALIFICATIONS_MAX,
  ROLE_REPORTS_TO_MAX,
  ROLE_RESPONSIBILITIES_MAX,
  ROLE_SUMMARY_MAX,
} from "../../../../../convex/lib/roleText";

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must not exceed 100 characters")
    .matches(/^[A-Za-z0-9\s\-_]+$/, "Role name can only contain letters, numbers, spaces, hyphens, and underscores")
    .test("has-letter", "Role name cannot be numbers only", (value) => hasLetter(value))
    .required("Role name is required"),

  summary: yup
    .string()
    .trim()
    .max(ROLE_SUMMARY_MAX, `Summary must not exceed ${ROLE_SUMMARY_MAX} characters`)
    .optional(),

  reportsTo: yup
    .string()
    .trim()
    .max(ROLE_REPORTS_TO_MAX, `Reports to must not exceed ${ROLE_REPORTS_TO_MAX} characters`)
    .optional(),

  descriptionSummary: yup
    .string()
    .trim()
    .max(
      ROLE_DESCRIPTION_SUMMARY_MAX,
      `Description summary must not exceed ${ROLE_DESCRIPTION_SUMMARY_MAX} characters`,
    )
    .optional(),

  responsibilities: yup
    .string()
    .trim()
    .max(
      ROLE_RESPONSIBILITIES_MAX,
      `Responsibilities must not exceed ${ROLE_RESPONSIBILITIES_MAX} characters`,
    )
    .optional(),

  qualifications: yup
    .string()
    .trim()
    .max(
      ROLE_QUALIFICATIONS_MAX,
      `Qualifications must not exceed ${ROLE_QUALIFICATIONS_MAX} characters`,
    )
    .optional(),

  isSystemRole: yup
    .boolean()
    .required("System role status is required"),

  permissions: yup
    .object()
    .optional()
    .default({}),
});

