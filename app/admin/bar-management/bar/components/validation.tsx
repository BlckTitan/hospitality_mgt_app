import * as yup from "yup";

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(1, "Bar name must be at least 1 character")
    .max(100, "Bar name must not exceed 100 characters")
    .required("Bar name is required"),

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