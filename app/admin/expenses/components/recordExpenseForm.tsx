'use client';

import { useMutation } from 'convex/react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import InputComponent from '../../../../shared/input';
import SelectComponent from '../../../../shared/select';
import { PAYMENT_METHOD_OPTIONS } from '../../billing/components/labels';
import { cashPeriodBounds } from '../../../../lib/cashPeriod';
import { EXPENSE_CATEGORY_OPTIONS } from './categoryLabels';

const EXPENSE_NAME_MAX_LENGTH = 80;
const INVOICE_NUMBER_MAX_LENGTH = 20;

type FormData = {
  name: string;
  amount: string;
  expenseDate: string;
  category: 'utilities' | 'supplies' | 'staff' | 'maintenance' | 'other';
  vendor: string;
  description: string;
  invoiceNumber: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check';
};

function todayInputValue(timeZone: string) {
  const { start } = cashPeriodBounds(Date.now(), 'day', timeZone);
  return new Date(start).toISOString().slice(0, 10);
}

function dateInputToTimestamp(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return Date.now();
  return Date.UTC(year, month - 1, day);
}

export function RecordExpenseForm({
  propertyId,
  timeZone,
  onClose,
}: {
  propertyId: Id<'properties'>;
  timeZone: string;
  onClose: () => void;
}) {
  const createPaidExpense = useMutation(api.expenses.createPaidExpense);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      amount: '',
      expenseDate: todayInputValue(timeZone),
      category: 'other',
      vendor: '',
      description: '',
      invoiceNumber: '',
      paymentMethod: 'bank_transfer',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const amount = Number(data.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          toast.error('Enter an amount greater than 0');
          return;
        }
        const recorded = await createPaidExpense({
          propertyId,
          name: data.name.trim(),
          amount,
          expenseDate: dateInputToTimestamp(data.expenseDate),
          category: data.category,
          vendor: data.vendor,
          description: data.description || undefined,
          invoiceNumber: data.invoiceNumber || undefined,
          paymentMethod: data.paymentMethod,
        });
        if (!recorded.success) {
          toast.error(recorded.message);
          return;
        }
        toast.success(recorded.message);
        onClose();
      })}
    >
      <InputComponent
        id='name'
        label='Name *'
        type='text'
        inputWidth='w-full'
        maxLength={EXPENSE_NAME_MAX_LENGTH}
        placeholder='e.g. Office printer ink'
        register={register('name', {
          required: 'Name is required',
          maxLength: {
            value: EXPENSE_NAME_MAX_LENGTH,
            message: `Name must be ${EXPENSE_NAME_MAX_LENGTH} characters or fewer`,
          },
        })}
        error={errors.name}
      />
      <InputComponent
        id='amount'
        label='Amount *'
        type='number'
        step='0.01'
        inputWidth='w-full'
        register={register('amount', { required: true })}
      />
      <InputComponent
        id='expenseDate'
        label='Date *'
        type='date'
        inputWidth='w-full'
        register={register('expenseDate', { required: true })}
      />
      <SelectComponent
        id='category'
        label='Category *'
        selectWidth='w-full'
        options={[...EXPENSE_CATEGORY_OPTIONS]}
        register={register('category')}
      />
      <InputComponent
        id='vendor'
        label='Vendor *'
        type='text'
        inputWidth='w-full'
        register={register('vendor', { required: true })}
      />
      <InputComponent
        id='description'
        label='Description'
        type='text'
        inputWidth='w-full'
        register={register('description')}
      />
      <InputComponent
        id='invoiceNumber'
        label={`Invoice number (max ${INVOICE_NUMBER_MAX_LENGTH})`}
        type='text'
        inputWidth='w-full'
        maxLength={INVOICE_NUMBER_MAX_LENGTH}
        register={register('invoiceNumber', {
          maxLength: {
            value: INVOICE_NUMBER_MAX_LENGTH,
            message: `Invoice number must be ${INVOICE_NUMBER_MAX_LENGTH} characters or fewer`,
          },
        })}
        error={errors.invoiceNumber}
      />
      <SelectComponent
        id='paymentMethod'
        label='Payment method *'
        selectWidth='w-full'
        options={PAYMENT_METHOD_OPTIONS}
        register={register('paymentMethod')}
      />
      <div className='flex justify-end gap-2 mt-3'>
        <Button variant='secondary' type='button' onClick={onClose}>Cancel</Button>
        <Button variant='dark' type='submit'>Save</Button>
      </div>
    </form>
  );
}
