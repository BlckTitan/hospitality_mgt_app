import * as yup from "yup";

export const SHIFT_DEPARTMENTS = [
  "front-office",
  "housekeeping",
  "fnb",
  "restaurant",
  "maintenance",
  "finance",
  "admin",
  "other",
] as const;

export const DEPARTMENT_LABELS: Record<(typeof SHIFT_DEPARTMENTS)[number], string> = {
  "front-office": "Front office",
  housekeeping: "Housekeeping",
  fnb: "Food & beverage",
  restaurant: "Restaurant",
  maintenance: "Maintenance",
  finance: "Finance",
  admin: "Admin",
  other: "Other",
};

const CLOCK_TIME = /^([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

/** Value for `<input type="time">`, which only accepts zero-padded HH:MM. */
export function clockInputValue(value?: string | null) {
  if (!value) return "";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export const formSchema = yup.object().shape({
  employeeId: yup.string().required("Staff is required"),
  department: yup
    .string()
    .oneOf([...SHIFT_DEPARTMENTS], "Select a department")
    .required("Department is required"),
  barId: yup.string().test(
    "fnb-bar",
    "Bar is required for food & beverage shifts",
    function (value) {
      if (this.parent.department !== "fnb") return true;
      return Boolean(value && value.trim());
    },
  ),
  shiftDate: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .required("Shift date is required"),
  startTime: yup
    .string()
    .matches(CLOCK_TIME, "Start time must be in HH:MM format")
    .required("Start time is required"),
  endTime: yup
    .string()
    .nullable()
    .transform((value) => (value == null || String(value).trim() === "" ? null : String(value).trim()))
    .test("end-time", "End time must be in HH:MM format", (value) => value == null || CLOCK_TIME.test(value)),
});
