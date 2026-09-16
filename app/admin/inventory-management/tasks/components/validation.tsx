import * as yup from "yup";

export const formSchema = yup.object().shape({
  taskType: yup
    .string()
    .oneOf(["restock", "putaway"], "Invalid task type")
    .required("Task type is required"),
  inventoryItemId: yup.string().required("Item is required"),
  purchaseOrderId: yup.string(),
  leadId: yup.string(),
  helperIds: yup.array().of(yup.string()),
});

export const editFormSchema = yup.object().shape({
  status: yup
    .string()
    .oneOf(["pending", "in-progress", "completed", "cancelled"], "Invalid status")
    .required("Status is required"),
  leadId: yup.string(),
  helperIds: yup.array().of(yup.string()),
  notes: yup.string().max(1000, "Notes are too long"),
});
