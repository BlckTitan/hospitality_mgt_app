import * as yup from 'yup';

export const formSchema = yup.object().shape({
  employeeId: yup.string().required('Select a staff member'),
  workDate: yup.string().required('Work date is required'),
  regularHours: yup.number().min(0).required('Regular hours are required'),
  overtimeHours: yup.number().min(0).required('Overtime hours are required'),
  notes: yup.string().optional(),
});
