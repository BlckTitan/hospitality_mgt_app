import * as yup from 'yup';

export const formSchema = yup.object().shape({
  payScheduleId: yup.string().required('Select a Pay cycle'),
});
