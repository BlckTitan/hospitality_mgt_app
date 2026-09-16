import * as yup from "yup";

export const formSchema = yup.object().shape({
  title: yup
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .required("Title is required"),

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

  leadId: yup.string(),
  helperIds: yup.array().of(yup.string()),
  supplierId: yup.string(),
  notes: yup.string().max(1000, "Notes are too long"),
});
