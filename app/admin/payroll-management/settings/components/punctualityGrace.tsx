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
import { punctualityGraceSchema } from './validation';

type FormData = {
  punctualityGraceMinutes: number;
};

export default function PunctualityGrace({
  propertyId,
  graceMinutes,
}: {
  propertyId: Id<'properties'>;
  graceMinutes?: number;
}) {
  const updateSettings = useMutation(api.payrollConfig.updateSettings);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(punctualityGraceSchema) as any,
    defaultValues: { punctualityGraceMinutes: graceMinutes ?? 5 },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const result = await updateSettings({
      propertyId,
      punctualityGraceMinutes: data.punctualityGraceMinutes,
    });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  return (
    <section className="mb-6">
      <h4>Punctuality</h4>
      <p className="text-sm text-gray-600 mb-2">
        Staff are on time if they start at or before the department shift, or within this many minutes after.
        This does not change pay.
      </p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={fieldRowClassName}>
          <InputComponent
            id="punctualityGraceMinutes"
            label="Grace minutes"
            type="number"
            inputWidth="w-2/12"
            register={register('punctualityGraceMinutes', { valueAsNumber: true })}
            error={errors.punctualityGraceMinutes}
          />
        </div>
        <Button variant="dark" type="submit">Save grace</Button>
      </form>
    </section>
  );
}
