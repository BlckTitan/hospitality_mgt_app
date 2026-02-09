import * as yup from 'yup';

export const RecipeValidationSchema = yup.object({
  menuItemId: yup.string().required('Menu item is required'),
  name: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .required('Name is required'),
  servings: yup
    .number()
    .typeError('Servings must be a number')
    .positive('Servings must be a positive number')
    .optional(),
  instructions: yup
    .string()
    .max(1000, 'Instructions must be at most 1000 characters')
    .optional(),
});

export type RecipeValidationType = yup.InferType<typeof RecipeValidationSchema>;
