import * as yup from "yup";
import { recordName } from "../../../../../lib/yupFields";
import { BUILTIN_BEVERAGE_CATEGORIES } from "../../../../../convex/lib/beverageCategoryCatalog";

export const beverageCategories = BUILTIN_BEVERAGE_CATEGORIES;

export const formSchema = yup.object().shape({
  name: recordName("Beverage name", { min: 1, max: 120 }),

  category: yup
    .string()
    .trim()
    .min(1, "Category is required")
    .required("Category is required"),

  unitOfMeasure: yup
    .string()
    .trim()
    .min(1, "Unit of measure is required")
    .max(30, "Unit of measure must not exceed 30 characters")
    .required("Unit of measure is required"),

  size: yup
    .string()
    .trim()
    .min(1, "Size is required")
    .max(30, "Size must not exceed 30 characters")
    .required("Size is required"),

  unitPrice: yup
    .number()
    .min(0, "Unit price cannot be negative")
    .required("Unit price is required"),

  unitsPerPack: yup
    .number()
    .transform((value, original) => (original === "" || original === null || original === undefined || Number.isNaN(value) ? undefined : value))
    .integer("Bottles per crate must be a whole number")
    .min(1, "Bottles per crate must be at least 1")
    .optional(),

  manualUnitCost: yup
    .number()
    .transform((value, original) => (original === "" || original === null || original === undefined || Number.isNaN(value) ? undefined : value))
    .min(0, "Manual unit cost cannot be negative")
    .optional(),

  reorderLevel: yup
    .number()
    .min(0, "Reorder level cannot be negative")
    .required("Reorder level is required"),

  isActive: yup
    .boolean()
    .required("Active status is required"),

  imageUrl: yup
    .string()
    .trim()
    .url("Upload a valid image")
    .required("Beverage image is required"),
});