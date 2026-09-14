import * as yup from 'yup';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from '../../shift/components/validation';

export { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS };

export const formSchema = yup.object().shape({
  department: yup
    .string()
    .oneOf([...SHIFT_DEPARTMENTS], 'Select a department')
    .required('Department is required'),
  name: yup.string().required('Name is required'),
  startTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Start time must be in HH:MM format')
    .required('Start time is required'),
  endTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'End time must be in HH:MM format')
    .required('End time is required'),
  barId: yup.string().when('department', {
    is: 'fnb',
    then: (schema) => schema.required('Bar is required for F&B shifts'),
    otherwise: (schema) => schema.optional(),
  }),
  isDefault: yup.boolean().required(),
  isActive: yup.boolean().optional(),
});
