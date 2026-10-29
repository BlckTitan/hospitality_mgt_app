import * as yup from 'yup';
import { recordName } from '../../../../../lib/yupFields';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from '../../shift/components/validation';

export { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS };

export const formSchema = yup.object().shape({
  department: yup
    .string()
    .oneOf([...SHIFT_DEPARTMENTS], 'Select a department')
    .required('Department is required'),
  name: recordName('Name', { max: 80 }),
  startTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Start time must be in HH:MM format')
    .required('Start time is required'),
  endTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'End time must be in HH:MM format')
    .required('End time is required'),
  isDefault: yup.boolean().required(),
  isActive: yup.boolean().optional(),
});
