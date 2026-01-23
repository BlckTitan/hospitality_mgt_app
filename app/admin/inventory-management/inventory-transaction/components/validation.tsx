import * as yup from "yup";

export const formSchema = yup.object().shape({
  inventoryItemId: yup
    .string()
    .required("Inventory item is required"),

  transactionType: yup
    .string()
    .oneOf(['purchase', 'usage', 'adjustment', 'waste', 'transfer'], "Invalid transaction type")
    .required("Transaction type is required"),

  quantity: yup
    .number()
    .required("Quantity is required")
    .min(0.01, "Quantity must be greater than 0"),

  unitCost: yup
    .number()
    .min(0, "Unit cost cannot be negative")
    .optional()
    .nullable(),

  referenceType: yup
    .string()
    .max(100, "Reference type must not exceed 100 characters")
    .optional()
    .nullable(),

  referenceId: yup
    .string()
    .max(100, "Reference ID must not exceed 100 characters")
    .optional()
    .nullable(),

  reason: yup
    .string()
    .trim()
    .max(500, "Reason must not exceed 500 characters")
    .optional()
    .nullable(),

  performedBy: yup
    .string()
    .optional()
    .nullable(),

  transactionDate: yup
    .number()
    .required("Transaction date is required"),
});
