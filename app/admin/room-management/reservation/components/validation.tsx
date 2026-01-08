import * as yup from "yup";

export const formSchema = yup.object().shape({
  guestId: yup
    .string()
    .required("Guest is required"),

  roomId: yup
    .string()
    .required("Room is required"),

  checkInDate: yup
    .string()
    .required("Check-in date is required")
    .test('is-future', 'Check-in date cannot be in the past', function(value) {
      if (!value) return true;
      const checkIn = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return checkIn >= today;
    }),

  checkOutDate: yup
    .string()
    .required("Check-out date is required")
    .test('is-after-checkin', 'Check-out date must be after check-in date', function(value) {
      const { checkInDate } = this.parent;
      if (!checkInDate || !value) return true;
      return new Date(value) > new Date(checkInDate);
    }),

  numberOfGuests: yup
    .number()
    .min(1, "Number of guests must be at least 1")
    .required("Number of guests is required"),

  rate: yup
    .number()
    .min(0, "Rate cannot be negative")
    .required("Rate is required"),

  totalAmount: yup
    .number()
    .min(0, "Total amount cannot be negative")
    .required("Total amount is required"),

  depositAmount: yup
    .number()
    .min(0, "Deposit amount cannot be negative")
    .optional(),

  status: yup
    .string()
    .oneOf(['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'], "Invalid status")
    .required("Status is required"),

  source: yup
    .string()
    .oneOf(['direct', 'ota', 'walk-in', 'phone', 'other'], "Invalid source")
    .optional(),

  specialRequests: yup
    .string()
    .max(500, "Special requests must not exceed 500 characters")
    .optional(),
});
