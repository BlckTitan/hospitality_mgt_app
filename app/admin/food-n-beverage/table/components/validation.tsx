import * as yup from 'yup';

export const tableValidationSchema = yup.object({
  tableNumber: yup
    .string()
    .required('Table number is required')
    .min(1, 'Table number must be at least 1 character')
    .max(50, 'Table number must not exceed 50 characters'),
  capacity: yup
    .number()
    .required('Capacity is required')
    .min(1, 'Capacity must be at least 1')
    .max(999, 'Capacity must not exceed 999'),
  section: yup
    .string()
    .optional()
    .max(100, 'Section must not exceed 100 characters'),
});
