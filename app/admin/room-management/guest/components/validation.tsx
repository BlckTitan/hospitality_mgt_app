import * as yup from "yup";

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
    .matches(/^\+?\d{10,15}$/, "Enter a valid phone number (10-15 digits)"),

  address: yup
    .string()
    .max(500, "Address is too long"),

  dateOfBirth: yup
    .date()
    .max(new Date(), "Date of birth cannot be in the future")
    .nullable(),

  loyaltyNumber: yup
    .string()
    .max(50, "Loyalty number is too long"),
});
