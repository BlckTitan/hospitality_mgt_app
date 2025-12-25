import * as yup from "yup";

export const formSchema = yup.object().shape({
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
    )
    .required('Email is required'),

  name: yup
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .matches(/^[A-Za-z\s]+$/, "Name must contain only letters")
    .required("Name is required"),

  phone: yup
    .string()
    .matches(/^\+?\d{10,15}$/, "Enter a valid phone number"),

  isActive: yup
    .mixed<boolean | string>()
    .test('is-boolean-or-string', 'Active status must be true or false', (value) => {
      if (typeof value === 'boolean') return true;
      if (typeof value === 'string') return value === 'true' || value === 'false';
      return false;
    })
    .required("Active status is required"),
});

