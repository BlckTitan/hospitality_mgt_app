import * as yup from 'yup';

export const RecipeValidationSchema = yup.object().shape({
  menuItemId: yup
    .string()
    .required('Menu item is required'),

  name: yup
    .string()
    .trim()
    .min(2, 'Recipe name must be at least 2 characters')
    .max(150, 'Recipe name must be at most 150 characters')
    .matches(/^[A-Za-z0-9\s\-&'(),./]+$/, 'Recipe name contains invalid characters')
    .required('Recipe name is required'),

  servings: yup
    .number()
    .typeError('Servings must be a number')
    .positive('Servings must be greater than 0')
    .integer('Servings must be a whole number')
    .max(999, 'Servings must be 999 or less')
    .nullable()
    .optional()
    .default(undefined),

  instructions: yup
    .string()
    .trim()
    .min(10, 'Instructions must be at least 10 characters')
    .max(2000, 'Instructions must be at most 2000 characters')
    .required('Instructions are required'),
});

export type RecipeValidationType = yup.InferType<typeof RecipeValidationSchema>;
