import * as yup from 'yup';

export const RecipeLineValidationSchema = yup.object({
  inventoryItemId: yup
    .string()
    .required('Ingredient is required'),

  quantity: yup
    .number()
    .typeError('Quantity must be a number')
    .positive('Quantity must be more than 0')
    .required('Quantity is required'),

  unit: yup
    .string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must not exceed 20 characters')
    .required('Unit is required'),

  wastePercent: yup
    .number()
    .typeError('Waste percent must be a number')
    .min(0, 'Waste percent cannot be negative')
    .max(100, 'Waste percent cannot exceed 100')
    .optional(),
});

export type RecipeLineValidationType = yup.InferType<typeof RecipeLineValidationSchema>;