import * as yup from 'yup';

const emptyNumber = (value: unknown, original: unknown) =>
  original === '' || original === null || original === undefined || Number.isNaN(value) ? undefined : value;

export const formSchema = yup.object().shape({
  beverageId: yup.string().required('Beverage is required'),
  barId: yup.string().when('txnType', {
    is: 'issue',
    then: (schema) => schema.required('Bar is required for issues'),
    otherwise: (schema) => schema.optional(),
  }),
  txnType: yup.string().oneOf(['receive', 'issue'], 'Transaction type is required').required('Transaction type is required'),
  qty: yup
    .number()
    .transform(emptyNumber)
    .when('txnType', {
      is: 'issue',
      then: (schema) => schema.typeError('Quantity must be a number').positive('Quantity must be greater than 0').required('Quantity is required'),
      otherwise: (schema) => schema.optional(),
    }),
  unitCost: yup.number().transform(emptyNumber).min(0, 'Unit cost cannot be negative').optional(),
  packQty: yup.number().transform(emptyNumber).optional(),
  packPrice: yup.number().transform(emptyNumber).min(0, 'Price per crate cannot be negative').optional(),
  unitsPerPack: yup.number().transform(emptyNumber).optional(),
  notes: yup.string().optional(),
});

export const editFormSchema = formSchema;
