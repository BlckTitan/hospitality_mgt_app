'use client'

import { useMutation, useQuery } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'sonner';
import { Button } from 'react-bootstrap';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { formSchema } from './validation';
import InputComponent from '../../../../../shared/input';
import DatepickerComponent from '../../../../../shared/datepicker';

type FormData = {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date | null;
  endDate: Date | null;
  notes?: string;
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
  const createTimeOff = useMutation(api.leaveEntries.createTimeOff);
  const staff = useQuery(api.payrollConfig.listStaffForProperty, {
    propertyId: propertyId as Id<'properties'>,
  });
  const config = useQuery(api.payrollConfig.getSettings, {
    propertyId: propertyId as Id<'properties'>,
  });

  const { control, register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      employeeId: '',
      leaveTypeId: '',
      startDate: null,
      endDate: null,
      notes: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!data.startDate || !data.endDate) return;
    const response = await createTimeOff({
      propertyId: propertyId as Id<'properties'>,
      employeeId: data.employeeId as Id<'staffs'>,
      leaveTypeId: data.leaveTypeId as Id<'leaveTypes'>,
      startDate: data.startDate.getTime(),
      endDate: data.endDate.getTime(),
      notes: data.notes || undefined,
    });
    if (response.success === false) {
      toast.error(response.message);
      return;
    }
    toast.success('Time off recorded');
    onSuccess();
    window.location.href = '/admin/payroll-management/time-off';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full lg:w-1/3">
          <label htmlFor="employeeId">Staff *</label>
          <select id="employeeId" {...register('employeeId')} defaultValue="">
            <option value="" disabled>Select staff</option>
            {(staff?.data ?? []).map((row) => (
              <option key={row._id} value={row._id}>
                {row.firstName} {row.lastName}
              </option>
            ))}
          </select>
          {errors.employeeId && <span className="text-red-500 text-sm">{errors.employeeId.message}</span>}
        </div>
        <div className="w-full lg:w-1/3">
          <label htmlFor="leaveTypeId">Time-off type *</label>
          <select id="leaveTypeId" {...register('leaveTypeId')} defaultValue="">
            <option value="" disabled>Select type</option>
            {(config?.data?.leaveTypes ?? []).filter((t) => t.isActive).map((type) => (
              <option key={type._id} value={type._id}>
                {type.name}{type.paid ? '' : ' (unpaid)'}
              </option>
            ))}
          </select>
          {errors.leaveTypeId && <span className="text-red-500 text-sm">{errors.leaveTypeId.message}</span>}
        </div>
        <DatepickerComponent
          id="startDate"
          name="startDate"
          label="Start date *"
          dateWidth="w-1/3"
          control={control}
          error={errors.startDate}
        />
      </div>
      <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <DatepickerComponent
          id="endDate"
          name="endDate"
          label="End date *"
          dateWidth="w-1/3"
          control={control}
          error={errors.endDate}
        />
        <InputComponent
          id="notes"
          label="Notes"
          type="text"
          inputWidth="w-1/3"
          register={register('notes')}
          error={errors.notes}
        />
      </div>
      <div className="flex gap-2 justify-end mt-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Save Time off</Button>
      </div>
    </form>
  );
}
