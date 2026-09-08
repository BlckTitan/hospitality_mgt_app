import * as yup from 'yup';

export const formSchema = yup.object().shape({
  employeeId: yup.string().required('Select a staff member'),
  timeOffTypeId: yup.string().required('Select a Time-off type'),
  startDate: yup.date().required('Start date is required').nullable(),
  endDate: yup.date().required('End date is required').nullable(),
  notes: yup.string().optional(),
});
