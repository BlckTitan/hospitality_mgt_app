import * as yup from "yup";

export const formSchema = yup.object().shape({
  userId: yup
    .string()
    .required("User is required"),

  barId: yup
    .string()
    .required("Bar is required"),

  beverageId: yup
    .string()
    .required("Beverage is required"),

  logDate: yup
    .string()
    .required("Date is required"),

  openingStock: yup
    .number()
    .min(0, "Opening stock cannot be negative")
    .required("Opening stock is required"),

  closingStock: yup
    .number()
    .min(0, "Closing stock cannot be negative")
    .required("Closing stock is required"),
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
});
