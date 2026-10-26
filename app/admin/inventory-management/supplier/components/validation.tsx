import * as yup from "yup";
import { recordName } from "../../../../../lib/yupFields";

export const formSchema = yup.object().shape({
  name: recordName("Name"),

  contactPerson: recordName("Contact person name", { required: false, max: 200 }),

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
