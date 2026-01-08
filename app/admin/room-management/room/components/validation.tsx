import * as yup from "yup";

export const formSchema = yup.object().shape({
  roomNumber: yup
    .string()
    .trim()
    .min(1, "Room number must be at least 1 character")
    .max(20, "Room number must not exceed 20 characters")
    .required("Room number is required"),

  roomTypeId: yup
    .string()
    .required("Room type is required"),

  floor: yup
    .number()
    .min(0, "Floor cannot be negative")
    .max(200, "Floor cannot exceed 200")
    .optional(),

  status: yup
    .string()
    .oneOf(['available', 'occupied', 'out-of-order', 'maintenance'], "Invalid status")
    .required("Status is required"),

  notes: yup
    .string()
    .trim()
    .max(500, "Notes must not exceed 500 characters")
    .optional(),

  isActive: yup
    .boolean()
    .required("Active status is required"),
});

