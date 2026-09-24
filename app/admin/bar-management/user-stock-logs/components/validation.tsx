import * as yup from "yup";

export const formSchema = yup.object().shape({
  userId: yup.string().required("User is required"),
  barId: yup.string().required("Bar is required"),
  beverageId: yup.string().required("Beverage is required"),
  shiftId: yup.string().optional(),
  closingStock: yup
    .number()
    .min(0, "Closing stock cannot be negative")
    .optional(),
});

export const editFormSchema = yup.object().shape({
  openingStock: yup
    .number()
    .min(0, "Opening stock cannot be negative")
    .required("Opening stock is required"),
  closingStock: yup
    .number()
    .min(0, "Closing stock cannot be negative")
    .required("Closing stock is required"),
  wasteQuantity: yup
    .number()
    .min(0, "Waste cannot be negative")
    .transform((value, original) => (original === "" || Number.isNaN(value) ? 0 : value))
    .optional(),
  wasteReason: yup.string().optional(),
  compQuantity: yup
    .number()
    .min(0, "Comps cannot be negative")
    .transform((value, original) => (original === "" || Number.isNaN(value) ? 0 : value))
    .optional(),
  compReason: yup.string().optional(),
});

export const WASTE_REASONS = ["spill", "breakage", "expired", "other"] as const;
export const COMP_REASONS = ["guest", "staff", "promo", "other"] as const;
