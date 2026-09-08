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
  workDate: Date | null;
  regularHours: number;
  overtimeHours: number;
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
  const createHours = useMutation(api.hours.createHours);
  const staff = useQuery(api.payrollConfig.listStaffForProperty, {
    propertyId: propertyId as Id<'properties'>,
  });

  const { control, register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      employeeId: '',
      workDate: null,
      regularHours: 8,
      overtimeHours: 0,
      notes: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!data.workDate) return;
    const response = await createHours({
      propertyId: propertyId as Id<'properties'>,
      employeeId: data.employeeId as Id<'staffs'>,
      workDate: data.workDate.getTime(),
      regularHours: Number(data.regularHours),
      overtimeHours: Number(data.overtimeHours),
      notes: data.notes || undefined,
    });
    if (response.success === false) {
      toast.error(response.message);
      return;
    }
    toast.success('Hours recorded');
    onSuccess();
    window.location.href = '/admin/payroll-management/hours';
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
        <DatepickerComponent
          id="workDate"
          name="workDate"
          label="Work date *"
          dateWidth="w-1/3"
          control={control}
          error={errors.workDate}
        />
        <InputComponent
          id="regularHours"
          label="Regular hours *"
          type="number"
          inputWidth="w-1/3"
          register={register('regularHours')}
          error={errors.regularHours}
        />
      </div>
      <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <InputComponent
          id="overtimeHours"
          label="Overtime hours *"
          type="number"
          inputWidth="w-1/3"
          register={register('overtimeHours')}
          error={errors.overtimeHours}
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
        <Button variant="dark" type="submit">Save Hours</Button>
      </div>
    </form>
  );
}
