'use client';

import { useMutation, useQuery } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'sonner';
import { Button } from 'react-bootstrap';
import InputComponent from '../../../../shared/input';
import SelectComponent from '../../../../shared/select';
import { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import { accountFormSchema } from './accountValidation';
import { BILL_TYPE_OPTIONS, FREQUENCY_OPTIONS } from './labels';
import { usePermissions } from '../../../../hooks/usePermissions';

export type AccountFormData = {
  name: string;
  billType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'local_government' | 'other';
  frequency: 'weekly' | 'monthly' | 'annually';
  isMetered: boolean;
  provider: string;
  accountNumber?: string | null;
  supplierId?: string | null;
  expectedAmount?: number | null;
  glAccountCode?: string | null;
  isActive: boolean;
};

export function CreateAccountForm({
  propertyId,
  onClose,
}: {
  propertyId: string;
  onClose: () => void;
}) {
  const createAccount = useMutation(api.billing.createAccount);
  const { hasGranularPermission } = usePermissions();
  const canReadSuppliers = hasGranularPermission('inventory.read');
  const suppliers = useQuery(
    api.suppliers.getAllSuppliers,
    canReadSuppliers ? { propertyId: propertyId as Id<'properties'>, activeOnly: true } : 'skip',
  );

  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: yupResolver(accountFormSchema) as any,
    defaultValues: {
      name: '',
      billType: 'electricity',
      frequency: 'monthly',
      isMetered: false,
      provider: '',
      accountNumber: '',
      supplierId: '',
      expectedAmount: undefined,
      glAccountCode: '',
      isActive: true,
    },
  });

  const onSubmit: SubmitHandler<AccountFormData> = async (data) => {
    try {
      const response = await createAccount({
        propertyId: propertyId as Id<'properties'>,
        name: data.name,
        billType: data.billType,
        frequency: data.frequency,
        isMetered: data.isMetered,
        provider: data.provider,
        accountNumber: data.accountNumber || undefined,
        supplierId: data.supplierId ? (data.supplierId as Id<'suppliers'>) : undefined,
        expectedAmount: data.expectedAmount ?? undefined,
        glAccountCode: data.glAccountCode || undefined,
        isActive: data.isActive,
      });
      if (response.success === false) {
        toast.error(response.message);
        return;
      }
      toast.success(response.message);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create bill account.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className='flex flex-col lg:flex-row gap-2 mb-3'>
        <div className='flex-1'>
          <InputComponent id='name' label='Name *' type='text' inputWidth='w-full' register={register('name')} error={errors.name} />
        </div>
        <div className='flex-1'>
          <InputComponent id='provider' label='Provider *' type='text' inputWidth='w-full' register={register('provider')} error={errors.provider} />
        </div>
      </div>
      <div className='flex flex-col lg:flex-row gap-2 mb-3'>
        <div className='flex-1'>
          <SelectComponent id='billType' label='Type *' selectWidth='w-full' options={BILL_TYPE_OPTIONS} register={register('billType')} error={errors.billType} />
        </div>
        <div className='flex-1'>
          <SelectComponent id='frequency' label='Frequency *' selectWidth='w-full' options={FREQUENCY_OPTIONS} register={register('frequency')} error={errors.frequency} />
        </div>
      </div>
      <div className='flex flex-col lg:flex-row gap-2 mb-3'>
        <div className='flex-1'>
          <InputComponent id='accountNumber' label='Account number' type='text' inputWidth='w-full' register={register('accountNumber')} error={errors.accountNumber} />
        </div>
        <div className='flex-1'>
          <SelectComponent
            id='supplierId'
            label='Supplier (optional)'
            selectWidth='w-full'
            options={[
              { value: '', label: 'None' },
              ...(suppliers?.data ?? []).map((row) => ({ value: row._id, label: row.name })),
            ]}
            register={register('supplierId')}
            error={errors.supplierId}
          />
        </div>
      </div>
      <div className='flex flex-col lg:flex-row gap-2 mb-3'>
        <div className='flex-1'>
          <InputComponent id='expectedAmount' label='Expected amount' type='number' step='0.01' inputWidth='w-full' register={register('expectedAmount')} error={errors.expectedAmount} />
        </div>
        <div className='flex-1'>
          <InputComponent id='glAccountCode' label='GL account code' type='text' inputWidth='w-full' register={register('glAccountCode')} error={errors.glAccountCode} />
        </div>
      </div>
      <label className='flex items-center gap-2 mb-2'>
        <input type='checkbox' {...register('isMetered')} />
        Metered (usage / meter readings)
      </label>
      <label className='flex items-center gap-2 mb-4'>
        <input type='checkbox' {...register('isActive')} />
        Active
      </label>
      <div className='flex justify-end gap-2'>
        <Button variant='secondary' type='button' onClick={onClose}>Cancel</Button>
        <Button variant='primary' type='submit'>Save</Button>
      </div>
    </form>
  );
}
