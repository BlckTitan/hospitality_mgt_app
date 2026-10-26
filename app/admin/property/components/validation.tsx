import * as yup from 'yup';
import { emptyStringToUndefined, optionalEmail, recordName } from '../../../../lib/yupFields';

export const propertyFormSchema = yup.object().shape({
  name: recordName('Property name', { max: 100 }),
  address: yup.string().trim().transform(emptyStringToUndefined).optional(),
  phone: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, {
      message: 'Please enter a valid phone number',
      excludeEmptyString: true,
    })
    .optional(),
  email: optionalEmail(),
  timezone: yup.string().optional(),
  retainerReminderDays: yup
    .number()
    .transform((value, original) => (original === '' || original == null || Number.isNaN(value) ? undefined : value))
    .integer('Use a whole number of days')
    .min(0, '0 keeps the reminder on checkout day only')
    .max(7, 'Reminder window cannot exceed 7 days')
    .optional(),
  currency: yup.string().optional(),
  taxId: yup.string().optional(),
  isActive: yup.boolean().required('Active status is required'),
  logoUrl: yup
    .string()
    .trim()
    .transform((value, original) => (original === '' || original == null ? undefined : value))
    .url('Upload a valid logo image')
    .notRequired(),
  coverImageUrl: yup
    .string()
    .trim()
    .transform((value, original) => (original === '' || original == null ? undefined : value))
    .url('Upload a valid cover image')
    .notRequired(),
});
