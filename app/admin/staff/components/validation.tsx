import * as yup from "yup";
import {
  contractDateError,
  emergencyContactError,
  nationalIdError,
  positionError,
} from "../../../../convex/lib/fieldText";
import { emptyStringToUndefined, optionalEmail, personName } from "../../../../lib/yupFields";

const optionalDate = yup.string().trim().transform(emptyStringToUndefined).optional();

export const formSchema = yup.object().shape({
  DoB: yup
    .date()
    .max(new Date(), "Date of birth cannot be in the future")
    .typeError("Enter a valid date of birth")
    .required("Date of birth is required"),

  firstName: personName("First name"),
  lastName: personName("Last name"),

  role: yup.string().required("Role is required"),
  department: yup.string().optional(),
  shiftTemplateId: yup.string().optional(),
  email: optionalEmail(),
  address: yup
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address is too long")
    .required("Address is required"),
  phone: yup
    .string()
    .trim()
    .matches(/^\+?\d{10,15}$/, "Enter a valid phone number")
    .required("Phone number is required"),
  stateOfOrigin: yup
    .string()
    .trim()
    .min(2, "Enter a valid state")
    .required("State of origin is required"),
  LGA: yup
    .string()
    .trim()
    .min(2, "Enter a valid LGA")
    .required("LGA is required"),
  salary: yup
    .number()
    .transform((value, original) =>
      original === "" || original === null || original === undefined ? undefined : value,
    )
    .typeError("Salary must be a number")
    .min(0, "Salary cannot be negative")
    .optional(),
  employmentType: yup
    .string()
    .oneOf(["full-time", "part-time", "casual", "contractor"])
    .required("Employment type is required"),
  userId: yup.string().optional(),
  clockMethod: yup
    .string()
    .transform((value) => (value === "" ? undefined : value))
    .oneOf(["self", "supervisor", "kiosk"])
    .optional(),
  dateRecruited: yup.date().optional().nullable(),
  position: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .test("position", function (value) {
      const message = positionError(value);
      return message ? this.createError({ message }) : true;
    })
    .optional(),
  idType: yup
    .string()
    .transform((value) => (value === "" ? undefined : value))
    .oneOf(["nin", "passport", "drivers_license", "other"])
    .optional(),
  nationalId: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .test("national-id", function (value) {
      const message = nationalIdError(this.parent.idType, value);
      return message ? this.createError({ message }) : true;
    })
    .optional(),
  emergencyName: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .test("emergency-name", function (value) {
      const message = emergencyContactError(value, this.parent.emergencyPhone, this.parent.emergencyRelationship);
      if (!message || !message.startsWith("Emergency name")) return true;
      return this.createError({ message });
    })
    .optional(),
  emergencyPhone: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .test("emergency-phone", function (value) {
      const message = emergencyContactError(this.parent.emergencyName, value, this.parent.emergencyRelationship);
      if (!message || !message.toLowerCase().includes("phone")) return true;
      return this.createError({ message });
    })
    .optional(),
  emergencyRelationship: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .test("emergency-relationship", function (value) {
      const message = emergencyContactError(this.parent.emergencyName, this.parent.emergencyPhone, value);
      if (!message || !message.startsWith("Relationship")) return true;
      return this.createError({ message });
    })
    .optional(),
  contractStartDate: optionalDate,
  contractEndDate: optionalDate.test("contract-end", function (value) {
    const message = contractDateError(this.parent.contractStartDate, value, undefined);
    if (!message || message.startsWith("Probation")) return true;
    return this.createError({ message });
  }),
  probationEndDate: optionalDate.test("probation-end", function (value) {
    const message = contractDateError(this.parent.contractStartDate, this.parent.contractEndDate, value);
    if (!message || !message.startsWith("Probation")) return true;
    return this.createError({ message });
  }),

  imageUrl: yup
    .string()
    .trim()
    .url("Upload a valid image")
    .required("Staff photo is required"),
});

export const CLOCK_METHOD_OPTIONS = [
  { value: "self", label: "Self (phone / login)" },
  { value: "supervisor", label: "Supervisor clocks them" },
  { value: "kiosk", label: "On-site kiosk" },
];
