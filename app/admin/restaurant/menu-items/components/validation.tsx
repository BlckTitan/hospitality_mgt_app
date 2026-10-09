import * as yup from 'yup'

export const STATION_OPTIONS = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'grill', label: 'Grill' },
  { value: 'other', label: 'Other' },
]

export const formSchema = yup.object().shape({
  name: yup.string().trim().required('Name is required'),
  category: yup.string().trim().required('Category is required'),
  station: yup.string().oneOf(['kitchen', 'grill', 'other']).required('Station is required'),
  price: yup
    .number()
    .typeError('Enter a valid price')
    .min(0, 'Price must be 0 or more')
    .required('Price is required'),
  isAvailable: yup.boolean().required(),
})
