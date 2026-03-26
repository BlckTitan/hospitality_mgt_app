import * as yup from "yup";

export const formSchema = yup.object().shape({
  userId: yup
    .string()
    .required("User is required"),

  barId: yup
    .string()
    .required("Bar is required"),

  shiftDate: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .required("Shift date is required"),

  startTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Start time must be in HH:MM format")
    .required("Start time is required"),

  endTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "End time must be in HH:MM format")
    .optional(),

  isFinalized: yup
    .boolean()
    .required("Finalized status is required"),
});
