'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import SelectComponent from '../../../../shared/select';
import { useForm } from 'react-hook-form';
import { PAYMENT_METHOD_OPTIONS } from './labels';

export function PayBillForm({
  periodId,
  propertyId,
  onClose,
}: {
  periodId: Id<'billPeriods'>;
  propertyId: Id<'properties'>;
  onClose: () => void;
}) {
  const markPaid = useMutation(api.billing.markPeriodPaid);
  const generateUploadUrl = useMutation(api.billing.generateUploadUrl);
  const attachDocument = useMutation(api.billing.attachDocument);
  const [file, setFile] = useState<File | null>(null);
  const { register, handleSubmit } = useForm({
    defaultValues: { paymentMethod: 'bank_transfer' as 'cash' | 'card' | 'bank_transfer' | 'check' },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        if (file) {
          const postUrl = await generateUploadUrl({ propertyId });
          const result = await fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          if (!result.ok) {
            toast.error('Failed to upload the receipt');
            return;
          }
          const { storageId } = await result.json();
          const attached = await attachDocument({
            periodId,
            kind: 'receipt',
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
        const paid = await markPaid({
          periodId,
          paymentMethod: data.paymentMethod,
        });
        if (!paid.success) {
          toast.error(paid.message);
          return;
        }
        toast.success(paid.message);
        onClose();
      })}
    >
      <SelectComponent
        id='paymentMethod'
        label='Payment method *'
        selectWidth='w-full'
        options={PAYMENT_METHOD_OPTIONS}
        register={register('paymentMethod')}
      />
      <label className='block my-3'>
        Receipt (optional)
        <input
          type='file'
          className='block mt-1'
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className='flex justify-end gap-2'>
        <Button variant='secondary' type='button' onClick={onClose}>Cancel</Button>
        <Button variant='primary' type='submit'>Mark paid</Button>
      </div>
    </form>
  );
}
