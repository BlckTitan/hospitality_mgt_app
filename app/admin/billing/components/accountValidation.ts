import * as yup from 'yup';
import { recordName } from '../../../../lib/yupFields';

export const accountFormSchema = yup.object().shape({
  name: recordName('Name'),
  billType: yup
    .string()
    .oneOf(['electricity', 'water', 'gas', 'internet', 'cable', 'waste', 'local_government', 'other'])
    .required('Type is required'),
  frequency: yup.string().oneOf(['weekly', 'monthly', 'annually']).required('Frequency is required'),
  isMetered: yup.boolean().required(),
  provider: yup.string().trim().required('Provider is required'),
  accountNumber: yup.string().trim().optional().nullable(),
  supplierId: yup.string().optional().nullable(),
  expectedAmount: yup.number().transform((value, original) => (original === '' || original === null ? undefined : value)).optional().nullable(),
  glAccountCode: yup.string().trim().optional().nullable(),
  isActive: yup.boolean().required(),
});
