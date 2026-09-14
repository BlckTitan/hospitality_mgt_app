import * as yup from 'yup';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from '../../shift/components/validation';

export { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS };

export const formSchema = yup.object().shape({
  coveringEmployeeId: yup.string().required('Select who will cover'),
  notes: yup.string().optional(),
});
