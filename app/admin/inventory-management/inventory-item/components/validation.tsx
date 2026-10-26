import * as yup from "yup";
import { recordName } from "../../../../../lib/yupFields";

export const formSchema = yup.object().shape({
  sku: yup
    .string()
    .trim()
    .min(1, "SKU must be at least 1 character")
    .max(50, "SKU must not exceed 50 characters")
    .required("SKU is required"),

  name: recordName("Name"),

  category: recordName("Category", { min: 1, max: 100 }),

  unit: yup
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(20, "Unit must not exceed 20 characters")
    .required("Unit is required"),

  openingQuantity: yup
    .number()
    .min(0, "Opening quantity cannot be negative")
    .optional()
    .nullable(),

  reorderPoint: yup
    .number()
    .min(0, "Reorder point cannot be negative")
    .optional()
    .nullable(),

  reorderQuantity: yup
    .number()
    .min(0, "Reorder quantity cannot be negative")
    .optional()
    .nullable(),

  unitCost: yup
    .number()
    .min(0, "Unit cost cannot be negative")
    .optional()
    .nullable(),

  location: yup
    .string()
    .trim()
    .max(200, "Location must not exceed 200 characters")
    .optional()
    .nullable(),

  supplierId: yup
    .string()
    .optional()
    .nullable(),

  isActive: yup
    .boolean()
    .required("Active status is required"),

  imageUrl: yup
    .string()
    .trim()
    .transform((value, original) => (original === "" || original == null ? undefined : value))
    .url("Upload a valid image")
    .notRequired(),
});
