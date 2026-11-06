import * as yup from "yup";

export const formSchema = yup.object().shape({
  beverageId: yup.string().required("Beverage is required"),
  qtyInStore: yup.number().required("Quantity in store is required").min(0, "Quantity cannot be negative"),
  reorderThreshold: yup.number().required("Reorder threshold is required").min(0, "Reorder threshold cannot be negative"),
  unitCost: yup
    .number()
    .transform((value, original) =>
      original === "" || original === null || original === undefined || Number.isNaN(value) ? undefined : value,
    )
    .when("qtyInStore", {
      is: (qty: number) => typeof qty === "number" && qty > 0,
      then: (schema) =>
        schema
          .typeError("Unit cost is required when quantity is above 0")
          .required("Unit cost is required when quantity is above 0")
          .min(0, "Unit cost cannot be negative"),
      otherwise: (schema) => schema.optional(),
    }),
});

export const editFormSchema = yup.object().shape({
  reorderThreshold: yup.number().required("Reorder threshold is required").min(0, "Reorder threshold cannot be negative"),
});
