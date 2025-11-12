import * as yup from "yup";

export const formSchema = yup.object().shape({
  DoB: yup
    .date()
    .max(new Date(), "Date of birth cannot be in the future")
    .required("Date of birth is required"),

  firstName: yup
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .matches(/^[A-Za-z\s]+$/, "First name must contain only letters")
    .required("First name is required"),

  lastName: yup
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .matches(/^[A-Za-z\s]+$/, "Last name must contain only letters")
    .required("Last name is required"),

  role: yup
    .string()
    .oneOf(
      [
        "Manager",
        "Assistant Manager",
        "Supervisor",
        "Griller",
        "Housekeeper",
        "Receptionist",
        "Laundry Attendant",
        "Security",
      ],
      "Invalid role"
    )
    .required("Role is required"),
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
  .test(
    "allowed-domain",
    "Only company emails are allowed",
    value => {
      if (!value) return true;
      return value.endsWith("@yourcompany.com");
    }
  )
  .required('Email is required'),
  
  address: yup
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .required("Address is required"),

  phone: yup
    .string()
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
    .typeError("Salary must be a number")
    .test(
      "min-amount",
      "Salary must be at least 10,000",
      value => value !== undefined && value >= 10000
    )
    .test(
      "multiple-of-10000",
      "Salary must be in multiples of 10,000",
      value => value !== undefined && value % 10000 === 0
    )
    .positive("Salary must be a positive number")
    .required("Salary is required"),
});
