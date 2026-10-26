import * as yup from "yup";
import { recordName } from "../../../../../lib/yupFields";

export const formSchema = yup.object().shape({
  name: recordName("Bar name", { min: 1, max: 100 }),

  location: yup
    .string()
    .trim()
    .min(1, "Location must be at least 1 character")
    .max(200, "Location must not exceed 200 characters")
    .required("Location is required"),

  barType: yup
    .string()
    .oneOf(['Main', 'Lounge', 'Seat Out'], "Invalid bar type")
    .required("Bar type is required"),

  isActive: yup
    .boolean()
    .required("Active status is required"),
});