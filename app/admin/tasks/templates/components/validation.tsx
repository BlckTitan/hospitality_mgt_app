import * as yup from "yup";

export const formSchema = yup.object().shape({
  module: yup
    .string()
    .oneOf(["housekeeping", "maintenance", "inventory"], "Invalid module")
    .required("Module is required"),
  typeKey: yup
    .string()
    .trim()
    .min(2, "Type key is required")
    .required("Type key is required"),
  stepsText: yup
    .string()
    .trim()
    .min(2, "Add at least one checklist step")
    .required("Steps are required"),
});
