import * as yup from "yup";

const optionalMoney = yup
  .number()
  .transform((value, original) => (original === '' || original === null || Number.isNaN(value) ? undefined : value))
  .min(0, "Cost cannot be negative")
  .optional();

export const formSchema = yup.object().shape({
  title: yup
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .required("Title is required"),

  description: yup
    .string()
    .trim()
    .min(5, "Describe the maintenance work")
    .max(2000, "Description is too long")
    .required("Description is required"),

  orderType: yup
    .string()
    .oneOf(["preventive", "corrective", "emergency", "inspection"], "Invalid order type")
    .required("Order type is required"),

  status: yup
    .string()
    .oneOf(["pending", "in-progress", "completed", "cancelled"], "Invalid status"),

  priority: yup
    .string()
    .oneOf(["low", "medium", "high", "urgent"], "Invalid priority")
    .required("Priority is required"),

  estimatedCost: optionalMoney,
  actualCost: optionalMoney,
  leadId: yup.string(),
  helperIds: yup.array().of(yup.string()),
  supplierId: yup.string(),
  notes: yup.string().max(1000, "Notes are too long"),
});
