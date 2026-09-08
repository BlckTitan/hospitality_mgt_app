'use client'

import { useMutation } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { fieldRowClassName } from '../../../../../shared/field';
import InputComponent from '../../../../../shared/input';
import { sameName, timeOffTypeSchema } from './validation';

type FormData = {
  code: string;
  name: string;
  paid: boolean;
};

type TimeOffTypeRow = {
  _id: string;
  code: string;
  name: string;
  paid: boolean;
};

export default function TimeOffTypes({
  propertyId,
  timeOffTypes,
}: {
  propertyId: Id<'properties'>;
  timeOffTypes: TimeOffTypeRow[];
}) {
  const createTimeOffType = useMutation(api.payrollConfig.createTimeOffType);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(timeOffTypeSchema) as any,
    defaultValues: { code: '', name: '', paid: true },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (timeOffTypes.some((row) => row.code === data.code)) {
      toast.error('A Time-off type with this code already exists');
      return;
    }
    if (timeOffTypes.some((row) => sameName(row.name, data.name))) {
      toast.error('A Time-off type with this name already exists');
      return;
    }
    const result = await createTimeOffType({
      propertyId,
      code: data.code,
      name: data.name,
      paid: data.paid,
      countsTowardOvertime: false,
    });
    if (result.success === false) toast.error(result.message);
    else {
      toast.success(result.message);
      reset({ code: '', name: '', paid: true });
    }
  };

  return (
    <section className="mb-6">
      <h4>Time-off types</h4>
      <p className="text-sm text-gray-600 mb-2">
        Categories of leave. Unpaid approved time off reduces salary for the period (e.g. Unpaid, Annual, Sick).
      </p>
      <ul>
        {timeOffTypes.map((row) => (
          <li key={row._id}>{row.code} — {row.name} ({row.paid ? 'paid' : 'unpaid'})</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={fieldRowClassName}>
          <InputComponent
            id="leaveCode"
            label="Code"
            type="text"
            inputWidth="w-2/12"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            register={register('code')}
            error={errors.code}
          />
          <InputComponent
            id="leaveName"
            label="Name"
            type="text"
            inputWidth="w-4/12"
            placeholder="Name"
            register={register('name')}
            error={errors.name}
          />
          <InputComponent
            id="leavePaid"
            label="Paid"
            type="checkbox"
            inputWidth="w-2/12"
            register={register('paid')}
            error={errors.paid}
          />
        </div>
        <Button variant="dark" type="submit">Add Time-off type</Button>
      </form>
    </section>
  );
}
