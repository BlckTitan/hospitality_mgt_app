'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import InputComponent from '../../../../shared/input';
import { useForm } from 'react-hook-form';

export function CaptureBillForm({
  period,
  propertyId,
  onClose,
}: {
  period: {
    _id: Id<'billPeriods'>;
    amount?: number;
    invoiceNumber?: string;
    usageAmount?: number;
    unitRate?: number;
    meterReading?: number;
    previousMeterReading?: number;
    isMetered: boolean;
  };
  propertyId: Id<'properties'>;
  onClose: () => void;
}) {
  const capturePeriod = useMutation(api.billing.capturePeriod);
  const generateUploadUrl = useMutation(api.billing.generateUploadUrl);
  const attachDocument = useMutation(api.billing.attachDocument);
  const [file, setFile] = useState<File | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      amount: period.amount ?? undefined,
      invoiceNumber: period.invoiceNumber ?? '',
      usageAmount: period.usageAmount ?? undefined,
      unitRate: period.unitRate ?? undefined,
      meterReading: period.meterReading ?? undefined,
      previousMeterReading: period.previousMeterReading ?? undefined,
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
        const captured = await capturePeriod({
          periodId: period._id,
          amount,
          invoiceNumber: data.invoiceNumber || undefined,
          usageAmount: data.usageAmount ? Number(data.usageAmount) : undefined,
          unitRate: data.unitRate ? Number(data.unitRate) : undefined,
          meterReading: data.meterReading ? Number(data.meterReading) : undefined,
          previousMeterReading: data.previousMeterReading ? Number(data.previousMeterReading) : undefined,
        });
        if (!captured.success) {
          toast.error(captured.message);
          return;
        }
        if (file) {
          const postUrl = await generateUploadUrl({ propertyId });
          const result = await fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          if (!result.ok) {
            toast.error('Failed to upload the bill document');
            return;
          }
          const { storageId } = await result.json();
          const attached = await attachDocument({
            periodId: period._id,
            kind: 'bill',
            storageId,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          });
          if (!attached.success) {
            toast.error(attached.message);
            return;
          }
        }
        toast.success(captured.message);
        onClose();
      })}
    >
      <InputComponent
        id='amount'
        label='Amount *'
        type='number'
        step='0.01'
        inputWidth='w-full'
        register={register('amount', { valueAsNumber: true })}
        error={errors.amount as any}
      />
      <InputComponent
        id='invoiceNumber'
        label='Invoice number'
        type='text'
        inputWidth='w-full'
        register={register('invoiceNumber')}
      />
      {period.isMetered && (
        <>
          <InputComponent id='usageAmount' label='Usage' type='number' step='0.01' inputWidth='w-full' register={register('usageAmount', { valueAsNumber: true })} />
          <InputComponent id='unitRate' label='Unit rate' type='number' step='0.01' inputWidth='w-full' register={register('unitRate', { valueAsNumber: true })} />
          <InputComponent id='meterReading' label='Meter reading' type='number' step='0.01' inputWidth='w-full' register={register('meterReading', { valueAsNumber: true })} />
          <InputComponent id='previousMeterReading' label='Previous reading' type='number' step='0.01' inputWidth='w-full' register={register('previousMeterReading', { valueAsNumber: true })} />
        </>
      )}
      <label className='block my-3'>
        Bill document
        <input
          type='file'
          className='block mt-1'
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className='flex justify-end gap-2'>
        <Button variant='secondary' type='button' onClick={onClose}>Cancel</Button>
        <Button variant='primary' type='submit'>Save</Button>
      </div>
    </form>
  );
}
