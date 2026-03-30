import * as yup from 'yup';

export const formSchema = yup.object().shape({
  beverageId: yup.string().required('Beverage is required'),
  barId: yup.string().optional(),
  userId: yup.string().optional(),
  txnType: yup.string().oneOf(['receive', 'issue'], 'Transaction type is required').required('Transaction type is required'),
  qty: yup.number().typeError('Quantity must be a number').positive('Quantity must be greater than 0').required('Quantity is required'),
  txnDate: yup.date().required('Transaction date is required'),
  notes: yup.string().optional(),
});

export const editFormSchema = yup.object().shape({
  beverageId: yup.string().required('Beverage is required'),
  barId: yup.string().optional(),
  userId: yup.string().optional(),
  txnType: yup.string().oneOf(['receive', 'issue'], 'Transaction type is required').required('Transaction type is required'),
  qty: yup.number().typeError('Quantity must be a number').positive('Quantity must be greater than 0').required('Quantity is required'),
  txnDate: yup.date().required('Transaction date is required'),
  notes: yup.string().optional(),
});
