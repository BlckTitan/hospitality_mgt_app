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
import SelectComponent from '../../../../../shared/select';
import { fieldRowClassName } from '../../../../../shared/field';

type FormData = {
  employeeId: string;
  timeOffTypeId: string;
  startDate: string;
  endDate: string;
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
  const createTimeOff = useMutation(api.timeOff.createTimeOff);
  const staff = useQuery(api.payrollConfig.listStaffForProperty, {
    propertyId: propertyId as Id<'properties'>,
  });
  const config = useQuery(api.payrollConfig.getSettings, {
    propertyId: propertyId as Id<'properties'>,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      employeeId: '',
      timeOffTypeId: '',
      startDate: '',
      endDate: '',
      notes: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!data.startDate || !data.endDate) return;
    const response = await createTimeOff({
      propertyId: propertyId as Id<'properties'>,
      employeeId: data.employeeId as Id<'staffs'>,
      timeOffTypeId: data.timeOffTypeId as Id<'timeOffTypes'>,
      startDate: new Date(data.startDate).getTime(),
      endDate: new Date(data.endDate).getTime(),
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
      <div className={fieldRowClassName}>
        <SelectComponent
          id="employeeId"
          label="Staff *"
          selectWidth="w-4/12"
          defaultText="Select staff"
          register={register('employeeId')}
          error={errors.employeeId}
          options={(staff?.data ?? []).map((row) => ({
            value: row._id,
            label: `${row.firstName} ${row.lastName}`,
          }))}
        />
        <SelectComponent
          id="timeOffTypeId"
          label="Time-off type *"
          selectWidth="w-4/12"
          defaultText="Select type"
          register={register('timeOffTypeId')}
          error={errors.timeOffTypeId}
          options={(config?.data?.timeOffTypes ?? [])
            .filter((type) => type.isActive)
            .map((type) => ({
              value: type._id,
              label: `${type.name}${type.paid ? '' : ' (unpaid)'}`,
            }))}
        />
        <InputComponent
          id="startDate"
          label="Start date *"
          type="date"
          inputWidth="w-2/12"
          register={register('startDate')}
          error={errors.startDate}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="endDate"
          label="End date *"
          type="date"
          inputWidth="w-2/12"
          register={register('endDate')}
          error={errors.endDate}
        />
        <InputComponent
          id="notes"
          label="Notes"
          type="text"
          inputWidth="w-4/12"
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
