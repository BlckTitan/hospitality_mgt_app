import * as yup from "yup";
import { hasLetter } from "../../../../../convex/lib/fieldText";

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must not exceed 100 characters")
    .matches(/^[A-Za-z0-9\s\-_]+$/, "Role name can only contain letters, numbers, spaces, hyphens, and underscores")
    .test("has-letter", "Role name cannot be numbers only", (value) => hasLetter(value))
    .required("Role name is required"),

  description: yup
    .string()
    .trim()
    .max(5000, "Description must not exceed 5000 characters")
    .optional(),

  isSystemRole: yup
    .boolean()
    .required("System role status is required"),

  permissions: yup
    .object()
    .optional()
    .default({}),
});

