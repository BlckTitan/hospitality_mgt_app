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
import type { AccountFormData } from './createAccountForm';
import { usePermissions } from '../../../../hooks/usePermissions';

export function EditAccountForm({
  account,
  onClose,
}: {
  account: {
    _id: Id<'billAccounts'>;
    propertyId: Id<'properties'>;
    name: string;
    billType: AccountFormData['billType'];
    frequency: AccountFormData['frequency'];
    isMetered: boolean;
    provider: string;
    accountNumber?: string;
    supplierId?: Id<'suppliers'>;
    expectedAmount?: number;
    glAccountCode?: string;
    isActive: boolean;
  };
  onClose: () => void;
}) {
  const updateAccount = useMutation(api.billing.updateAccount);
  const { hasGranularPermission } = usePermissions();
  const canReadSuppliers = hasGranularPermission('inventory.read');
  const suppliers = useQuery(
    api.suppliers.getAllSuppliers,
    canReadSuppliers ? { propertyId: account.propertyId, activeOnly: true } : 'skip',
  );

  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: yupResolver(accountFormSchema) as any,
    defaultValues: {
      name: account.name,
      billType: account.billType,
      frequency: account.frequency,
      isMetered: account.isMetered,
      provider: account.provider,
      accountNumber: account.accountNumber ?? '',
      supplierId: account.supplierId ?? '',
      expectedAmount: account.expectedAmount,
      glAccountCode: account.glAccountCode ?? '',
      isActive: account.isActive,
    },
  });

  const onSubmit: SubmitHandler<AccountFormData> = async (data) => {
    try {
      const response = await updateAccount({
        accountId: account._id,
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
      toast.error('Failed to update bill account.');
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
