'use client'

import { useMutation, useQuery } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'sonner';
import { Button } from 'react-bootstrap';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { formSchema } from './validation';

type FormData = {
  payCycleId: string;
};

export function FormComponent({
  onSuccess,
  onClose,
  propertyId,
}: {
  onSuccess: () => void;
  onClose: () => void;
  propertyId: string;
}) {
  const startPayroll = useMutation(api.payrolls.startPayroll);
  const config = useQuery(api.payrollConfig.getSettings, {
    propertyId: propertyId as Id<'properties'>,
  });
  const payCycles = config?.data?.payCycles?.filter((s) => s.isActive) ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: { payCycleId: '' },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const response = await startPayroll({
      propertyId: propertyId as Id<'properties'>,
      payCycleId: data.payCycleId as Id<'payCycles'>,
    });
    if (response.success === false) {
      toast.error(response.message);
      return;
    }
    toast.success('Payroll started');
    onSuccess();
    window.location.href = '/admin/payroll-management/payroll';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full lg:w-1/3">
          <label htmlFor="payCycleId">Pay cycle *</label>
          <select id="payCycleId" {...register('payCycleId')} defaultValue="">
            <option value="" disabled>Select a Pay cycle</option>
            {payCycles.map((cycle) => (
              <option key={cycle._id} value={cycle._id}>
                {cycle.name} ({cycle.frequency})
              </option>
            ))}
          </select>
          {errors.payCycleId && (
            <span className="text-red-500 text-sm">{errors.payCycleId.message}</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Start payroll</Button>
      </div>
    </form>
  );
}
