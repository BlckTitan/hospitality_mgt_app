import * as yup from "yup";

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must not exceed 200 characters")
    .required("Name is required"),

  contactPerson: yup
    .string()
    .trim()
    .max(200, "Contact person name must not exceed 200 characters")
    .optional()
    .nullable(),

  email: yup
    .string()
    .trim()
    .email("Invalid email format")
    .max(200, "Email must not exceed 200 characters")
    .optional()
    .nullable(),

  phone: yup
    .string()
    .trim()
    .max(50, "Phone number must not exceed 50 characters")
    .optional()
    .nullable(),

  address: yup
    .string()
    .trim()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),

  paymentTerms: yup
    .string()
    .trim()
    .max(100, "Payment terms must not exceed 100 characters")
    .optional()
    .nullable(),

  taxId: yup
    .string()
    .trim()
    .max(100, "Tax ID must not exceed 100 characters")
    .optional()
    .nullable(),

  isActive: yup
    .boolean()
    .required("Active status is required"),
});
