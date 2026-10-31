import * as yup from 'yup'
import { recordName } from '../../../../../lib/yupFields'

export const formSchema = yup.object().shape({
  sku: recordName('SKU', { max: 40 }),
  name: recordName('Name', { max: 120 }),
  category: recordName('Category', { max: 80 }),
  unit: recordName('Unit', { max: 40 }),
  openingQuantity: yup
    .number()
    .typeError('Enter a valid quantity')
    .min(0, 'Opening quantity must be 0 or more')
    .required('Opening quantity is required'),
  reorderPoint: yup
    .number()
    .transform((value, original) => (original === '' || original === undefined ? undefined : value))
    .min(0, 'Reorder point must be 0 or more')
    .optional(),
  unitCost: yup
    .number()
    .transform((value, original) => (original === '' || original === undefined ? undefined : value))
    .min(0, 'Unit cost must be 0 or more')
    .optional(),
})
