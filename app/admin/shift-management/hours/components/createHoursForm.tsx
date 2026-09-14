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
  workDate: string;
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

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      employeeId: '',
      workDate: '',
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
      workDate: new Date(data.workDate).getTime(),
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
    window.location.href = '/admin/shift-management/hours';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className={fieldRowClassName}>
        <SelectComponent
          id="employeeId"
          label="Staff *"
          selectWidth="w-1/3"
          defaultText="Select staff"
          register={register('employeeId')}
          error={errors.employeeId}
          options={(staff?.data ?? []).map((row) => ({
            value: row._id,
            label: `${row.firstName} ${row.lastName}`,
          }))}
        />
        <InputComponent
          id="workDate"
          label="Work date *"
          type="date"
          inputWidth="w-2/12"
          register={register('workDate')}
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
      <div className={fieldRowClassName}>
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
