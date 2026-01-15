import * as yup from "yup";

export const formSchema = yup.object().shape({
  roomTypeId: yup
    .string()
    .required("Room type is required"),

  name: yup
    .string()
    .trim()
    .min(2, "Rate plan name must be at least 2 characters")
    .max(100, "Rate plan name is too long")
    .required("Rate plan name is required"),

  description: yup
    .string()
    .max(500, "Description is too long"),

  baseRate: yup
    .number()
    .typeError("Base rate must be a number")
    .positive("Base rate must be greater than 0")
    .required("Base rate is required"),

  discountPercent: yup
    .number()
    .typeError("Discount percent must be a number")
    .min(0, "Discount percent cannot be negative")
    .max(100, "Discount percent cannot exceed 100"),

  validFrom: yup
    .date()
    .required("Valid from date is required")
    .typeError("Please enter a valid date"),

  validTo: yup
    .date()
    .required("Valid to date is required")
    .typeError("Please enter a valid date")
    .test(
      "is-after-validFrom",
      "Valid to date must be after valid from date",
      function (value) {
        const { validFrom } = this.parent;
        if (!value || !validFrom) return true;
        return new Date(value) > new Date(validFrom);
      }
    ),

  isActive: yup
    .mixed<boolean | string>()
    .test('is-boolean-or-string', 'Active status must be true or false', (value) => {
      if (typeof value === 'boolean') return true;
      if (typeof value === 'string') return value === 'true' || value === 'false';
      return false;
    })
    .required("Active status is required"),
});
