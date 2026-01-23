import * as yup from "yup";

export const formSchema = yup.object().shape({
  sku: yup
    .string()
    .trim()
    .min(1, "SKU must be at least 1 character")
    .max(50, "SKU must not exceed 50 characters")
    .required("SKU is required"),

  name: yup
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must not exceed 200 characters")
    .required("Name is required"),

  category: yup
    .string()
    .trim()
    .min(1, "Category is required")
    .max(100, "Category must not exceed 100 characters")
    .required("Category is required"),

  unit: yup
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(20, "Unit must not exceed 20 characters")
    .required("Unit is required"),

  currentQuantity: yup
    .number()
    .min(0, "Current quantity cannot be negative")
    .required("Current quantity is required"),

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
});
