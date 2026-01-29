import * as yup from "yup";

export const formSchema = yup.object().shape({
  purchaseOrderId: yup
    .string()
    .required("Purchase order is required"),

  inventoryItemId: yup
    .string()
    .required("Inventory item is required"),

  quantity: yup
    .number()
    .min(0.01, "Quantity must be greater than 0")
    .required("Quantity is required"),

  unitPrice: yup
    .number()
    .min(0, "Unit price must be 0 or greater")
    .required("Unit price is required"),

  totalPrice: yup
    .number()
    .min(0, "Total price must be 0 or greater")
    .required("Total price is required"),

  receivedQuantity: yup
    .number()
    .min(0, "Received quantity must be 0 or greater")
    .optional()
    .nullable(),
});
