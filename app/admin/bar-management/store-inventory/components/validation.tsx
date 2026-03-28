import * as yup from 'yup';
import React from 'react';

export const formSchema = yup.object().shape({
  beverageId: yup.string().required('Beverage selection is required'),
  qtyInStore: yup.number()
    .typeError('Quantity must be a number')
    .required('Quantity is required')
    .min(0, 'Quantity cannot be negative')
    .integer('Quantity must be a whole number'),
  reorderThreshold: yup.number()
    .typeError('Reorder threshold must be a number')
    .required('Reorder threshold is required')
    .min(0, 'Reorder threshold cannot be negative')
    .integer('Reorder threshold must be a whole number'),
});
