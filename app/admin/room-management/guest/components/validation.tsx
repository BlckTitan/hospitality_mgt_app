import * as yup from "yup";
import { states_lga } from "../../../../../lib/data";

const STATE_NAMES = new Set(states_lga.map((row) => row.state));

const optionalText = (value: unknown, original: unknown) =>
  original == null || String(original).trim() === "" ? undefined : value;

const personName = (label: string) =>
  yup
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .matches(/^[A-Za-z\s'-]+$/, `${label} must contain only letters, spaces, hyphens, and apostrophes`)
    .required(`${label} is required`);

export const formSchema = yup.object().shape({
  firstName: yup
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .matches(/^[A-Za-z\s'-]+$/, "First name must contain only letters, spaces, hyphens, and apostrophes")
    .required("First name is required"),

  lastName: yup
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .matches(/^[A-Za-z\s'-]+$/, "Last name must contain only letters, spaces, hyphens, and apostrophes")
    .required("Last name is required"),

  email: yup
    .string()
    .trim()
    .transform((value, original) => (original == null || String(original).trim() === '' ? undefined : value))
    .optional()
    .email("Please enter a valid email address")
    .max(254, "Email is too long")
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address')
    .test(
      "no-temp-email",
      "Temporary email addresses are not allowed",
      value => {
        if (!value) return true;
        const blockedDomains = [
          "mailinator.com",
          "tempmail.com",
          "10minutemail.com",
          "guerrillamail.com",
        ];
        const domain = value.split("@")[1];
        return !blockedDomains.includes(domain);
      }
    ),

  phone: yup
    .string()
    .transform((value, original) => (original == null || String(original).trim() === '' ? undefined : value))
    .optional()
    .matches(/^\+?\d{10,15}$/, "Enter a valid phone number (10-15 digits)"),

  address: yup
    .string()
    .max(500, "Address is too long"),

  occupation: yup
    .string()
    .trim()
    .transform(optionalText)
    .optional()
    .max(80, "Occupation is too long"),

  stateOfOrigin: yup
    .string()
    .trim()
    .transform(optionalText)
    .optional()
    .test("known-state", "Choose a Nigerian state", (value) => !value || STATE_NAMES.has(value)),

  includeSpouse: yup.boolean().default(false),

  spouseFirstName: yup.string().when("includeSpouse", {
    is: true,
    then: () => personName("Spouse first name"),
    otherwise: (schema) => schema.transform(() => undefined).notRequired(),
  }),

  spouseLastName: yup.string().when("includeSpouse", {
    is: true,
    then: () => personName("Spouse last name"),
    otherwise: (schema) => schema.transform(() => undefined).notRequired(),
  }),

  spousePhone: yup.string().when("includeSpouse", {
    is: true,
    then: (schema) => schema
      .transform(optionalText)
      .optional()
      .matches(/^\+?\d{10,15}$/, "Enter a valid phone number (10-15 digits)"),
    otherwise: (schema) => schema.transform(() => undefined).notRequired(),
  }),

  spouseOccupation: yup.string().when("includeSpouse", {
    is: true,
    then: (schema) => schema.trim().transform(optionalText).optional().max(80, "Spouse occupation is too long"),
    otherwise: (schema) => schema.transform(() => undefined).notRequired(),
  }),

  dateOfBirth: yup
    .date()
    .transform((value, original) => (original == null || original === '' ? null : value))
    .nullable()
    .optional()
    .max(new Date(), "Date of birth cannot be in the future")
    .typeError("Enter a valid date of birth"),

  loyaltyNumber: yup
    .string()
    .max(50, "Loyalty number is too long"),

  imageUrl: yup
    .string()
    .trim()
    .transform((value, original) => (original === "" || original == null ? undefined : value))
    .url("Upload a valid image")
    .notRequired(),
});
