import * as yup from 'yup';

export const formSchema = yup.object().shape({
  employeeId: yup.string().required('Select a staff member'),
  timeOffTypeId: yup.string().required('Select a Time-off type'),
  startDate: yup.string().required('Start date is required'),
  endDate: yup.string().required('End date is required'),
  notes: yup.string().optional(),
});
