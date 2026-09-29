import * as yup from "yup";

const sharedReservationFields = {
  roomId: yup
    .string()
    .required("Room is required"),

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
    .oneOf(["pending", "confirmed"], "Choose pending or confirmed")
    .required("Booking status is required"),

  source: yup
    .string()
    .oneOf(["direct", "ota", "walk-in", "phone", "other"], "Invalid source"),

  specialRequests: yup
    .string()
    .max(1000, "Special requests are too long"),
};

const nameRules = {
  firstName: yup
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .matches(/^[A-Za-z\s'-]+$/, "First name must contain only letters, spaces, hyphens, and apostrophes"),
  lastName: yup
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .matches(/^[A-Za-z\s'-]+$/, "Last name must contain only letters, spaces, hyphens, and apostrophes"),
  email: yup
    .string()
    .trim()
    .transform((value, original) => (original === "" || original == null ? undefined : value))
    .email("Please enter a valid email address")
    .max(254, "Email is too long"),
  phone: yup
    .string()
    .trim()
    .transform((value, original) => (original === "" || original == null ? undefined : value))
    .matches(/^\+?\d{10,15}$/, {
      message: "Enter a valid phone number (10-15 digits)",
      excludeEmptyString: true,
    }),
};

export const formSchema = yup.object().shape({
  guestMode: yup
    .string()
    .oneOf(["existing", "new"], "Choose an existing or new guest")
    .required(),

  guestId: yup
    .string()
    .when("guestMode", {
      is: "existing",
      then: (schema) => schema.required("Select a guest"),
      otherwise: (schema) => schema.notRequired(),
    }),

  newGuestFirstName: yup
    .string()
    .when("guestMode", {
      is: "new",
      then: (schema) => nameRules.firstName.required("First name is required"),
      otherwise: (schema) => schema.notRequired(),
    }),

  newGuestLastName: yup
    .string()
    .when("guestMode", {
      is: "new",
      then: (schema) => nameRules.lastName.required("Last name is required"),
      otherwise: (schema) => schema.notRequired(),
    }),

  newGuestEmail: nameRules.email.notRequired(),
  newGuestPhone: nameRules.phone.notRequired(),

  checkInDate: yup
    .date()
    .required("Check-in date is required")
    .typeError("Please enter a valid date")
    .min(new Date(), "Check-in date cannot be in the past"),

  ...sharedReservationFields,
});

export const editFormSchema = yup.object().shape({
  checkInDate: yup
    .date()
    .required("Check-in date is required")
    .typeError("Please enter a valid date"),

  roomId: sharedReservationFields.roomId,
  checkOutDate: sharedReservationFields.checkOutDate,
  numberOfGuests: sharedReservationFields.numberOfGuests,
  rate: sharedReservationFields.rate,
  totalAmount: sharedReservationFields.totalAmount,
  depositAmount: sharedReservationFields.depositAmount,
  source: sharedReservationFields.source,
  specialRequests: sharedReservationFields.specialRequests,
});
