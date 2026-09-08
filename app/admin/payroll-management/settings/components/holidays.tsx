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
import { holidaySchema, sameName } from './validation';

type FormData = {
  date: string;
  name: string;
};

type HolidayRow = {
  _id: string;
  date: number;
  name: string;
};

export default function Holidays({
  propertyId,
  holidays,
}: {
  propertyId: Id<'properties'>;
  holidays: HolidayRow[];
}) {
  const createHoliday = useMutation(api.payrollConfig.createHoliday);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(holidaySchema) as any,
    defaultValues: { date: '', name: '' },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (holidays.some((row) => new Date(row.date).toISOString().slice(0, 10) === data.date)) {
      toast.error('A holiday already exists on this date');
      return;
    }
    if (holidays.some((row) => sameName(row.name, data.name))) {
      toast.error('A holiday with this name already exists');
      return;
    }
    const result = await createHoliday({
      propertyId,
      date: new Date(data.date).getTime(),
      name: data.name,
      isPaid: true,
    });
    if (result.success === false) toast.error(result.message);
    else {
      toast.success(result.message);
      reset({ date: '', name: '' });
    }
  };

  return (
    <section className="mb-6">
      <h4>Holidays</h4>
      <ul>
        {holidays.map((row) => (
          <li key={row._id}>{new Date(row.date).toISOString().slice(0, 10)} — {row.name}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={fieldRowClassName}>
          <InputComponent
            id="holidayDate"
            label="Date"
            type="date"
            inputWidth="w-2/12"
            register={register('date')}
            error={errors.date}
          />
          <InputComponent
            id="holidayName"
            label="Name"
            type="text"
            inputWidth="w-4/12"
            placeholder="Name"
            register={register('name')}
            error={errors.name}
          />
        </div>
        <Button variant="dark" type="submit">Add Holiday</Button>
      </form>
    </section>
  );
}
