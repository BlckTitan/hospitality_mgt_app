'use client';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { tableValidationSchema } from './validation';
import Button from 'react-bootstrap/Button';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { toast } from 'sonner';
import InputComponent from '../../../../../shared/input';
import { Id } from '../../../../../convex/_generated/dataModel';

export function FormComponent(props: any) {
  const createTableMutation = useMutation(api.tables.createTable);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(tableValidationSchema),
    defaultValues: {
      tableNumber: '',
      capacity: 1,
      section: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const result = await createTableMutation({
        propertyId: props.propertyId as Id<'properties'>,
        tableNumber: data.tableNumber,
        capacity: parseInt(data.capacity),
        section: data.section || undefined,
      });

      if (result.success) {
        toast.success('Table created successfully');
        reset();
        props.onSuccess();
      } else {
        toast.error(result.message || 'Failed to create table');
      }
    } catch (error: any) {
      console.error('Error creating table:', error);
      toast.error(error.message || 'Failed to create table');
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
        error={errors.tableNumber}
      />

      <InputComponent
        id='capacity'
        label='Capacity'
        type='number'
        inputWidth='w-full'
        placeholder='Number of seats'
        register={register('capacity', { required: true })}
        error={errors.capacity}
      />

      <InputComponent
        id='section'
        label='Section (Optional)'
        type='text'
        inputWidth='w-full'
        placeholder='e.g., Main Hall, Patio, Private'
        register={register('section')}
        error={errors.section}
      />

      <div className='flex gap-2 justify-end pt-4'>
        <Button variant='secondary' onClick={() => props.onClose()}>
          Cancel
        </Button>
        <Button variant='primary' type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Table'}
        </Button>
      </div>
    </form>
  );
}
