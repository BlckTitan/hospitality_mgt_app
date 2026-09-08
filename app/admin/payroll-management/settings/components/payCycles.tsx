'use client'

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { fieldRowClassName } from '../../../../../shared/field';
import SelectComponent from '../../../../../shared/select';
import { payCycleSchema } from './validation';

export const PAY_CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'annually', label: 'Annually' },
] as const;

type Frequency = (typeof PAY_CYCLE_OPTIONS)[number]['value'];

type FormData = {
  frequency: Frequency;
};

type PayCycleRow = {
  _id: string;
  name: string;
  frequency: string;
  isDefault: boolean;
};

function asFrequency(value: string): Frequency {
  return PAY_CYCLE_OPTIONS.some((option) => option.value === value)
    ? (value as Frequency)
    : 'monthly';
}

export default function PayCycles({
  propertyId,
  payCycles,
}: {
  propertyId: Id<'properties'>;
  payCycles: PayCycleRow[];
}) {
  const savePayCycle = useMutation(api.payrollConfig.savePayCycle);
  const current = payCycles.find((row) => row.isDefault) ?? payCycles[0];
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(payCycleSchema) as any,
    defaultValues: { frequency: asFrequency(current?.frequency ?? 'monthly') },
  });

  useEffect(() => {
    reset({ frequency: asFrequency(current?.frequency ?? 'monthly') });
  }, [current?._id, current?.frequency, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const result = await savePayCycle({
      propertyId,
      frequency: data.frequency,
    });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  return (
    <section className="mb-6">
      <h4>Pay cycle</h4>
      <p className="text-sm text-gray-600 mb-2">
        This property has one pay cycle. Choose monthly, weekly, or annually — Start payroll copies this period.
        {current?.frequency === 'bi-weekly' ? ' The current cycle is bi-weekly. Save a new option to replace it.' : ''}
      </p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={fieldRowClassName}>
          <SelectComponent
            id="payCycleFrequency"
            label="How often you pay"
            selectWidth="w-2/12"
            register={register('frequency')}
            error={errors.frequency}
            options={[...PAY_CYCLE_OPTIONS]}
          />
        </div>
        <Button variant="dark" type="submit">Save Pay cycle</Button>
      </form>
    </section>
  );
}
