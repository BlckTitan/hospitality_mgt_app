import * as yup from 'yup'

export const formSchema = yup.object().shape({
  tableNumber: yup.string().trim().required('Table number is required'),
  capacity: yup
    .number()
    .typeError('Enter a capacity')
    .moreThan(0, 'Capacity must be greater than 0')
    .required('Capacity is required'),
  section: yup.string().trim().optional(),
})
