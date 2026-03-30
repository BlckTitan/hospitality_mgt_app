import * as yup from "yup";

export const formSchema = yup.object().shape({
  beverageId: yup.string().required("Beverage is required"),
  qtyInStore: yup.number().required("Quantity in store is required").min(0, "Quantity cannot be negative"),
  reorderThreshold: yup.number().required("Reorder threshold is required").min(0, "Reorder threshold cannot be negative"),
});
