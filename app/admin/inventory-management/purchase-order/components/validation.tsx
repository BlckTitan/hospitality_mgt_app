import * as yup from "yup";

export const formSchema = yup.object().shape({
  orderNumber: yup
    .string()
    .trim()
    .min(1, "Order number is required")
    .max(100, "Order number must not exceed 100 characters")
    .required("Order number is required"),

  supplierId: yup
    .string()
    .required("Supplier is required"),

  orderDate: yup
    .number()
    .required("Order date is required"),

  expectedDeliveryDate: yup
    .number()
    .optional()
    .nullable(),

  status: yup
    .string()
    .oneOf(['draft', 'sent', 'confirmed', 'received', 'cancelled'], 'Invalid status')
    .required("Status is required"),

  subtotal: yup
    .number()
    .min(0, "Subtotal must be 0 or greater")
    .required("Subtotal is required"),

  taxAmount: yup
    .number()
    .min(0, "Tax amount must be 0 or greater")
    .required("Tax amount is required"),

  shippingAmount: yup
    .number()
    .min(0, "Shipping amount must be 0 or greater")
    .optional()
    .nullable(),

  totalAmount: yup
    .number()
    .min(0, "Total amount must be 0 or greater")
    .required("Total amount is required"),
});
