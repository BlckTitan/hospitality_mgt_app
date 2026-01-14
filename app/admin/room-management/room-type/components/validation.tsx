import * as yup from "yup";

export const formSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, "Room type name must be at least 2 characters")
    .max(100, "Room type name must not exceed 100 characters")
    .required("Room type name is required"),

  description: yup
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .optional(),

  maxOccupancy: yup
    .number()
    .min(1, "Maximum occupancy must be at least 1")
    .max(10, "Maximum occupancy cannot exceed 10")
    .required("Maximum occupancy is required"),

  baseRate: yup
    .number()
    .min(0, "Base rate cannot be negative")
    .required("Base rate is required"),

  amenities: yup
    .array()
    .of(yup.string())
    .optional()
    .default([]),

  isActive: yup
    .boolean()
    .required("Active status is required"),
});
