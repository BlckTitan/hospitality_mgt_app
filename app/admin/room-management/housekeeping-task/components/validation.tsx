import * as yup from "yup";

export const formSchema = yup.object().shape({
  roomId: yup
    .string()
    .required("Room is required"),

  assignedTo: yup
    .string(),

  taskType: yup
    .string()
    .oneOf(["checkout", "stayover", "deep-clean", "inspection"], "Invalid task type")
    .required("Task type is required"),

  status: yup
    .string()
    .oneOf(["pending", "in-progress", "completed", "skipped"], "Invalid status")
    .required("Status is required"),

  priority: yup
    .string()
    .oneOf(["low", "medium", "high", "urgent"], "Invalid priority")
    .required("Priority is required"),

  scheduledAt: yup
    .date()
    .nullable()
    .typeError("Please enter a valid date"),

  estimatedDuration: yup
    .number()
    .typeError("Estimated duration must be a number")
    .positive("Estimated duration must be positive")
    .integer("Estimated duration must be an integer"),

  actualDuration: yup
    .number()
    .typeError("Actual duration must be a number")
    .positive("Actual duration must be positive")
    .integer("Actual duration must be an integer"),

  notes: yup
    .string()
    .max(1000, "Notes are too long"),
});
