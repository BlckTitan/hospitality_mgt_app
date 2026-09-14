import * as yup from "yup";

export const SHIFT_DEPARTMENTS = [
  "front-office",
  "housekeeping",
  "fnb",
  "maintenance",
  "finance",
  "admin",
  "other",
] as const;

export const DEPARTMENT_LABELS: Record<(typeof SHIFT_DEPARTMENTS)[number], string> = {
  "front-office": "Front office",
  housekeeping: "Housekeeping",
  fnb: "Food & beverage",
  maintenance: "Maintenance",
  finance: "Finance",
  admin: "Admin",
  other: "Other",
};

export const formSchema = yup.object().shape({
  employeeId: yup.string().required("Staff is required"),
  department: yup
    .string()
    .oneOf([...SHIFT_DEPARTMENTS], "Select a department")
    .required("Department is required"),
  barId: yup.string().when("department", {
    is: "fnb",
    then: (schema) => schema.required("Bar is required for F&B shifts"),
    otherwise: (schema) => schema.optional(),
  }),
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
    .transform((value) => (value === "" ? undefined : value))
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "End time must be in HH:MM format")
    .optional(),
});
