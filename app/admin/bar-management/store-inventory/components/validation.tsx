import * as yup from "yup";

const emptyNumber = (value: unknown, original: unknown) =>
  original === "" || original === null || original === undefined || Number.isNaN(value) ? undefined : value;

export const formSchema = yup.object().shape({
  beverageId: yup.string().required("Beverage is required"),
  packQty: yup
    .number()
    .transform(emptyNumber)
    .typeError("Crates are required")
    .required("Crates are required")
    .min(0, "Crates cannot be negative"),
  reorderThreshold: yup.number().required("Reorder threshold is required").min(0, "Reorder threshold cannot be negative"),
  packPrice: yup
    .number()
    .transform(emptyNumber)
    .when("packQty", {
      is: (qty: number) => typeof qty === "number" && qty > 0,
      then: (schema) =>
        schema.typeError("Price per crate is required").required("Price per crate is required").min(0, "Price per crate cannot be negative"),
      otherwise: (schema) => schema.optional(),
    }),
  unitsPerPack: yup
    .number()
    .transform(emptyNumber)
    .when("packQty", {
      is: (qty: number) => typeof qty === "number" && qty > 0,
      then: (schema) =>
        schema
          .typeError("Bottles per crate are required")
          .required("Bottles per crate are required")
          .integer("Bottles per crate must be a whole number")
          .min(1, "Bottles per crate must be at least 1"),
      otherwise: (schema) => schema.optional(),
    }),
});

export const editFormSchema = yup.object().shape({
  reorderThreshold: yup.number().required("Reorder threshold is required").min(0, "Reorder threshold cannot be negative"),
});
