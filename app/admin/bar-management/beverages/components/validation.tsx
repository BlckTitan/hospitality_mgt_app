import * as yup from "yup";

export const beverageCategories = [
  "spirits", "wine", "Lager beer", "cocktails", "non-alcoholic", 
  "liqueurs", "whiskey", "vodka", "rum", "gin", "tequila", 
  "brandy", "cognac", "champagne", "other"
] as const;

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(1, "Beverage name must be at least 1 character")
    .max(120, "Beverage name must not exceed 120 characters")
    .required("Beverage name is required"),

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

  unitPrice: yup
    .number()
    .min(0, "Unit price cannot be negative")
    .required("Unit price is required"),

  reorderLevel: yup
    .number()
    .min(0, "Reorder level cannot be negative")
    .required("Reorder level is required"),

  isActive: yup
    .boolean()
    .required("Active status is required"),
});