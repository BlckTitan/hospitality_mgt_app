import * as yup from 'yup';

export const propertyFormSchema = yup.object().shape({
  name: yup.string().required('Property name is required').min(2, 'Property name must be at least 2 characters'),
  address: yup.string().optional(),
  phone: yup
    .string()
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Please enter a valid phone number'),
  email: yup
    .string()
    .optional()
    .email('Please enter a valid email address'),
  timezone: yup.string().optional(),
  currency: yup.string().optional(),
  taxId: yup.string().optional(),
  isActive: yup.boolean().required('Active status is required'),
});
