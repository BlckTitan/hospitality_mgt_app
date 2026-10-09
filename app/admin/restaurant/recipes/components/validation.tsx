import * as yup from 'yup'

export const formSchema = yup.object().shape({
  menuItemId: yup.string().required('Select a menu item'),
  name: yup.string().trim().required('Recipe name is required'),
  servings: yup
    .number()
    .typeError('Enter servings')
    .moreThan(0, 'Servings must be greater than 0')
    .required('Servings is required'),
  instructions: yup.string().trim().optional(),
})
