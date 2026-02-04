import * as yup from "yup";

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, "Menu item name must be at least 2 characters")
    .max(100, "Menu item name must not exceed 100 characters")
    .required("Menu item name is required"),

  description: yup
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .optional(),

  category: yup
    .string()
    .trim()
    .min(2, "Category must be at least 2 characters")
    .max(50, "Category must not exceed 50 characters")
    .required("Category is required"),

  subcategory: yup
    .string()
    .trim()
    .max(50, "Subcategory must not exceed 50 characters")
    .optional(),

  price: yup
    .number()
    .min(0, "Price cannot be negative")
    .required("Price is required")
    .typeError("Price must be a number"),

  cost: yup
    .number()
    .min(0, "Cost cannot be negative")
    .optional()
    .typeError("Cost must be a number"),

  isAvailable: yup
    .boolean()
    .required("Availability status is required"),

  imageUrl: yup
    .string()
    .trim()
    .url("Image URL must be a valid URL")
    .max(500, "Image URL must not exceed 500 characters")
    .optional(),

  preparationTime: yup
    .number()
    .min(0, "Preparation time cannot be negative")
    .max(999, "Preparation time must not exceed 999 minutes")
    .optional()
    .typeError("Preparation time must be a number"),

  isActive: yup
    .boolean()
    .required("Active status is required"),
});
