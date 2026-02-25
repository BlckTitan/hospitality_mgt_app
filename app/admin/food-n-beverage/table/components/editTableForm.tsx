'use client';

import { FieldError, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Button from 'react-bootstrap/Button';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { api } from '../../../../../convex/_generated/api';
import InputComponent from '../../../../../shared/input';
import { Id } from '../../../../../convex/_generated/dataModel';
import { tableValidationSchema } from './validation';

export function EditTableForm(props: any) {
  const { table, propertyId } = props;
  const updateTableMutation = useMutation(api.tables.updateTable);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(tableValidationSchema),
    defaultValues: {
      tableNumber: table?.tableNumber || '',
      capacity: table?.capacity || 1,
      section: table?.section || '',
    },
  });

  useEffect(() => {
    if (table) {
      reset({
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        section: table.section || '',
      });
    }
  }, [table, reset]);

  const onSubmit = async (data: any) => {
    try {
      const result = await updateTableMutation({
        tableId: table._id as Id<'tables'>,
        propertyId: propertyId as Id<'properties'>,
        tableNumber: data.tableNumber,
        capacity: parseInt(data.capacity),
        section: data.section || undefined,
      });

      if (result.success) {
        toast.success('Table updated successfully');
        props.onSuccess();
      } else {
        toast.error(result.message || 'Failed to update table');
      }
    } catch (error: any) {
      console.error('Error updating table:', error);
      toast.error(error.message || 'Failed to update table');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <InputComponent
        id='tableNumber'
        label='Table Number'
        type='text'
        inputWidth='w-full'
        placeholder='e.g., T1, T2, Table A'
        register={register('tableNumber', { required: true })}
        error={errors.tableNumber as FieldError}
      />

      <InputComponent
        id='capacity'
        label='Capacity'
        type='number'
        inputWidth='w-full'
        placeholder='Number of seats'
        register={register('capacity', { required: true })}
        error={errors.capacity  as FieldError}
      />

      <InputComponent
        id='section'
        label='Section (Optional)'
        type='text'
        inputWidth='w-full'
        placeholder='e.g., Main Hall, Patio, Private'
        register={register('section')}
        error={errors.section as FieldError}
      />

      <div className='flex gap-2 justify-end pt-4'>
        <Button
          variant='secondary'
          onClick={() => {
            window.location.href = '/admin/food-n-beverage/table';
          }}
        >
          Cancel
        </Button>
        <Button variant='primary' type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update Table'}
        </Button>
      </div>
    </form>
  );
}
