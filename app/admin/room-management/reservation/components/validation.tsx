import * as yup from "yup";

export const formSchema = yup.object().shape({
  guestId: yup
    .string()
    .required("Guest is required"),

  roomId: yup
    .string()
    .required("Room is required"),

  checkInDate: yup
    .date()
    .required("Check-in date is required")
    .typeError("Please enter a valid date")
    .min(new Date(), "Check-in date cannot be in the past"),

  checkOutDate: yup
    .date()
    .required("Check-out date is required")
    .typeError("Please enter a valid date")
    .test(
      "is-after-checkIn",
      "Check-out date must be after check-in date",
      function (value) {
        const { checkInDate } = this.parent;
        if (!value || !checkInDate) return true;
        return new Date(value) > new Date(checkInDate);
      }
    ),

  numberOfGuests: yup
    .number()
    .typeError("Number of guests must be a number")
    .positive("Number of guests must be greater than 0")
    .integer("Number of guests must be an integer")
    .required("Number of guests is required"),

  rate: yup
    .number()
    .typeError("Rate must be a number")
    .positive("Rate must be greater than 0")
    .required("Rate is required"),

  totalAmount: yup
    .number()
    .typeError("Total amount must be a number")
    .positive("Total amount must be greater than 0")
    .required("Total amount is required"),

  depositAmount: yup
    .number()
    .typeError("Deposit amount must be a number")
    .min(0, "Deposit amount cannot be negative"),

  status: yup
    .string()
    .oneOf(["pending", "confirmed", "checked-in", "checked-out", "cancelled"], "Invalid status")
    .required("Status is required"),

  source: yup
    .string()
    .oneOf(["direct", "ota", "walk-in", "phone", "other"], "Invalid source"),

  specialRequests: yup
    .string()
    .max(1000, "Special requests are too long"),
});
