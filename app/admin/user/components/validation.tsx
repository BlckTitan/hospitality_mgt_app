import * as yup from "yup";
import { optionalPhone, personName } from "../../../../lib/yupFields";

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

  name: personName("Name"),

  phone: optionalPhone(),

  isActive: yup
    .mixed<boolean | string>()
    .test('is-boolean-or-string', 'Active status must be true or false', (value) => {
      if (typeof value === 'boolean') return true;
      if (typeof value === 'string') return value === 'true' || value === 'false';
      return false;
    })
    .required("Active status is required"),
});

