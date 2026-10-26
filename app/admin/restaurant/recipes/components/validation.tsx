import * as yup from 'yup'
import { recordName } from '../../../../../lib/yupFields'

export const formSchema = yup.object().shape({
  menuItemId: yup.string().required('Select a menu item'),
  name: recordName('Recipe name', { max: 120 }),
  servings: yup
    .number()
    .typeError('Enter servings')
    .moreThan(0, 'Servings must be greater than 0')
    .required('Servings is required'),
  instructions: yup.string().trim().optional(),
})
