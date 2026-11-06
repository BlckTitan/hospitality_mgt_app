import * as yup from 'yup';

export const formSchema = yup.object().shape({
  beverageId: yup.string().required('Beverage is required'),
  barId: yup.string().when('txnType', {
    is: 'issue',
    then: (schema) => schema.required('Bar is required for issues'),
    otherwise: (schema) => schema.optional(),
  }),
  txnType: yup.string().oneOf(['receive', 'issue'], 'Transaction type is required').required('Transaction type is required'),
  qty: yup.number().typeError('Quantity must be a number').positive('Quantity must be greater than 0').required('Quantity is required'),
  unitCost: yup
    .number()
    .transform((value, original) =>
      original === '' || original === null || original === undefined || Number.isNaN(value) ? undefined : value,
    )
    .when('txnType', {
      is: 'receive',
      then: (schema) =>
        schema.typeError('Unit cost is required').required('Unit cost is required').min(0, 'Unit cost cannot be negative'),
      otherwise: (schema) => schema.optional(),
    }),
  notes: yup.string().optional(),
});

export const editFormSchema = formSchema;
