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
  payScheduleId: string;
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
  const startPayroll = useMutation(api.payrollRuns.startPayroll);
  const config = useQuery(api.payrollConfig.getSettings, {
    propertyId: propertyId as Id<'properties'>,
  });
  const schedules = config?.data?.schedules?.filter((s) => s.isActive) ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: { payScheduleId: '' },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const response = await startPayroll({
      propertyId: propertyId as Id<'properties'>,
      payScheduleId: data.payScheduleId as Id<'paySchedules'>,
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
          <label htmlFor="payScheduleId">Pay cycle *</label>
          <select id="payScheduleId" {...register('payScheduleId')} defaultValue="">
            <option value="" disabled>Select a Pay cycle</option>
            {schedules.map((schedule) => (
              <option key={schedule._id} value={schedule._id}>
                {schedule.name} ({schedule.frequency})
              </option>
            ))}
          </select>
          {errors.payScheduleId && (
            <span className="text-red-500 text-sm">{errors.payScheduleId.message}</span>
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
