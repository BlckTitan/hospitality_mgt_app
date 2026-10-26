import * as yup from "yup";
import { recordName } from "../../../../../lib/yupFields";

export const formSchema = yup.object().shape({
  name: recordName("Room type name", { max: 100 }),

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

  imageUrl: yup
    .string()
    .trim()
    .transform((value, original) => (original === "" || original == null ? undefined : value))
    .url("Upload a valid image")
    .notRequired(),
});
