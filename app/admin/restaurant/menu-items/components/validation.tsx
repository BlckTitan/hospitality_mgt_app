import * as yup from 'yup'
import { recordName } from '../../../../../lib/yupFields'

export const STATION_OPTIONS = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'grill', label: 'Grill' },
  { value: 'other', label: 'Other' },
]

export const formSchema = yup.object().shape({
  name: recordName('Name', { max: 120 }),
  category: recordName('Category', { max: 80 }),
  station: yup.string().oneOf(['kitchen', 'grill', 'other']).required('Station is required'),
  price: yup
    .number()
    .typeError('Enter a valid price')
    .min(0, 'Price must be 0 or more')
    .required('Price is required'),
  isAvailable: yup.boolean().required(),
})
