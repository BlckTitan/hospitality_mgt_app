import * as yup from "yup";
import { recordName } from "../../../../../lib/yupFields";

export const beverageCategories = [
  "spirits", "wine", "Lager beer", "cocktails", "non-alcoholic", 
  "liqueurs", "whiskey", "vodka", "rum", "gin", "tequila", 
  "brandy", "cognac", "champagne", "other"
] as const;

export const formSchema = yup.object().shape({
  name: recordName("Beverage name", { min: 1, max: 120 }),

  category: yup
    .string()
    .trim()
    .oneOf(beverageCategories, "Please select a valid category")
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

  unitCost: yup
    .number()
    .min(0, "Unit cost cannot be negative")
    .transform((value, original) => (original === "" || Number.isNaN(value) ? undefined : value))
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