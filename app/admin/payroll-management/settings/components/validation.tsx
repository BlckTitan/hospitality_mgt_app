import * as yup from 'yup';

export const SETTINGS_CODE = /^\d{6}$/;

export function sameName(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export const countrySchema = yup.object({
  country: yup.string().required('Select a country'),
});

export const payCycleSchema = yup.object({
  frequency: yup
    .mixed<'monthly' | 'weekly' | 'annually'>()
    .oneOf(['monthly', 'weekly', 'annually'])
    .required('Select how often you pay'),
});

export const timeOffTypeSchema = yup.object({
  code: yup
    .string()
    .transform((value) => String(value ?? '').replace(/\D/g, '').slice(0, 6))
    .matches(SETTINGS_CODE, 'Code must be exactly 6 digits')
    .required('Code is required'),
  name: yup.string().trim().required('Enter a Time-off type name'),
  paid: yup.boolean().required(),
});

export const payItemTypeSchema = yup.object({
  code: yup
    .string()
    .transform((value) => String(value ?? '').replace(/\D/g, '').slice(0, 6))
    .matches(SETTINGS_CODE, 'Code must be exactly 6 digits')
    .required('Code is required'),
  name: yup.string().trim().required('Enter a Pay item type name'),
  kind: yup
    .mixed<'earning' | 'allowance' | 'deduction'>()
    .oneOf(['earning', 'allowance', 'deduction'])
    .required('Select a kind'),
  defaultAmount: yup.number().typeError('Enter a flat amount').min(0, 'Amount cannot be negative'),
});

export const holidaySchema = yup.object({
  date: yup.string().required('Select a holiday date'),
  name: yup.string().trim().required('Enter a holiday name'),
});

export const extraPayRuleSchema = yup.object({
  kind: yup
    .mixed<'daily_overtime' | 'weekend' | 'public_holiday'>()
    .oneOf(['daily_overtime', 'weekend', 'public_holiday'])
    .required('Select a rule'),
  multiplier: yup.number().typeError('Enter a multiplier').positive('Multiplier must be greater than 0'),
});

export const punctualityGraceSchema = yup.object({
  punctualityGraceMinutes: yup
    .number()
    .typeError('Enter grace minutes')
    .min(0, 'Grace cannot be negative')
    .max(120, 'Grace cannot exceed 120 minutes')
    .required('Enter grace minutes'),
});
