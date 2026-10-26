import * as yup from "yup";
import { recordName } from "../../../../lib/yupFields";

const optionalMoney = yup
  .number()
  .transform((value, original) => (original === '' || original === null || Number.isNaN(value) ? undefined : value))
  .min(0, "Cost cannot be negative")
  .optional();

export const formSchema = yup.object().shape({
  title: recordName("Title", { max: 200 }),

  description: yup
    .string()
    .trim()
    .min(5, "Describe the maintenance work")
    .max(2000, "Description is too long")
    .required("Description is required"),

  orderType: yup
    .string()
    .oneOf(["preventive", "corrective", "emergency", "inspection"], "Invalid order type")
    .required("Order type is required"),

  status: yup
    .string()
    .oneOf(["pending", "in-progress", "completed", "cancelled"], "Invalid status"),

  priority: yup
    .string()
    .oneOf(["low", "medium", "high", "urgent"], "Invalid priority")
    .required("Priority is required"),

  estimatedCost: optionalMoney,
  actualCost: optionalMoney,

  isScheduled: yup.boolean().default(false),

  scheduledDate: yup.string().when('isScheduled', {
    is: true,
    then: (schema) => schema.required('Choose the maintenance date'),
    otherwise: (schema) => schema.optional(),
  }),

  repeatEvery: yup.string().oneOf(['none', '1', '3', '6', '12', 'custom']).when('isScheduled', {
    is: true,
    then: (schema) => schema.required('Choose how often this repeats'),
    otherwise: (schema) => schema.optional(),
  }),

  customIntervalMonths: yup
    .number()
    .transform((value, original) => (original === '' || original === null || Number.isNaN(value) ? undefined : value))
    .when(['isScheduled', 'repeatEvery'], {
      is: (isScheduled: boolean, repeatEvery: string) => Boolean(isScheduled) && repeatEvery === 'custom',
      then: (schema) => schema
        .typeError('Enter how many months')
        .required('Enter how many months')
        .integer('Use a whole number of months')
        .min(1, 'Use at least 1 month')
        .max(60, 'Use 60 months or fewer'),
      otherwise: (schema) => schema.optional(),
    }),

  reminderDays: yup
    .number()
    .transform((value, original) => (original === '' || original === null || Number.isNaN(value) ? undefined : value))
    .when('isScheduled', {
      is: true,
      then: (schema) => schema
        .typeError('Enter how many days before to remind')
        .required('Enter how many days before to remind')
        .integer('Use a whole number of days')
        .min(0, 'Reminder cannot be negative')
        .max(90, 'Remind at most 90 days before'),
      otherwise: (schema) => schema.optional(),
    }),
  leadId: yup.string(),
  helperIds: yup.array().of(yup.string()),
  supplierId: yup.string(),
  notes: yup.string().max(1000, "Notes are too long"),
});
