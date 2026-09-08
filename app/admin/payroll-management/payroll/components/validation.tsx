import * as yup from 'yup';

export const formSchema = yup.object().shape({
  payCycleId: yup.string().required('Select a Pay cycle'),
});
