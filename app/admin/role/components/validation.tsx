import * as yup from "yup";

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must not exceed 100 characters")
    .matches(/^[A-Za-z0-9\s\-_]+$/, "Role name can only contain letters, numbers, spaces, hyphens, and underscores")
    .required("Role name is required"),

  description: yup
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .optional(),

  isSystemRole: yup
    .boolean()
    .required("System role status is required"),

  permissions: yup
    .object()
    .optional()
    .default({}),
});

