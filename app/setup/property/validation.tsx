import * as yup from 'yup';
import { hasLetter } from '../../../convex/lib/fieldText';
import { emptyStringToUndefined } from '../../../lib/yupFields';

export const propertySetupSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, 'Property name must be at least 2 characters')
    .max(100, 'Property name must not exceed 100 characters')
    .matches(/^[A-Za-z0-9\s\-&.,]+$/, 'Property name contains invalid characters')
    .test('has-letter', 'Property name cannot be numbers only', (value) => hasLetter(value))
    .required('Property name is required'),

  email: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address')
    .test(
      'no-temp-email',
      'Temporary email addresses are not allowed',
      (value) => {
        if (!value) return true;
        const blockedDomains = [
          'mailinator.com',
          'tempmail.com',
          '10minutemail.com',
          'guerrillamail.com',
        ];
        const domain = value.split('@')[1];
        return !blockedDomains.includes(domain);
      }
    )
    .optional(),

    phone: yup
    .string()
    .trim()
    .transform(emptyStringToUndefined)
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, {
      message: 'Please enter a valid phone number',
      excludeEmptyString: true,
    })
    .optional(),

  address: yup
    .string()
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must not exceed 200 characters')
    .optional(),

  timezone: yup
    .string()
    .trim()
    .required('Timezone is required'),

  currency: yup
    .string()
    .trim()
    .required('Currency is required'),

  taxId: yup
    .string()
    .trim()
    .max(50, 'Tax ID must not exceed 50 characters')
    .optional(),
});
