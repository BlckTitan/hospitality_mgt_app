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
    .positive("Salary must be a positive number")
    .required("Salary is required"),
});
