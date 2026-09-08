'use client'

import { useMutation } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { fieldRowClassName } from '../../../../../shared/field';
import SelectComponent from '../../../../../shared/select';
import { countrySchema } from './validation';

type FormData = {
  country: string;
};

type SettingsSummary = {
  country: string;
  jurisdictionPack: string;
  regularHoursLimitDaily?: number;
  overtimeMultiplier: number;
};

export default function Country({
  propertyId,
  settings,
}: {
  propertyId: Id<'properties'>;
  settings?: SettingsSummary | null;
}) {
  const seedSettings = useMutation(api.payrollConfig.seedSettings);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(countrySchema) as any,
    defaultValues: { country: 'NG' },
  });

  if (settings) {
    return (
      <section className="mb-6">
        <p>Country: {settings.country} · Pack: {settings.jurisdictionPack}</p>
        <p>Daily hours limit: {settings.regularHoursLimitDaily ?? '—'} · OT multiplier: {settings.overtimeMultiplier}</p>
      </section>
    );
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const result = await seedSettings({ propertyId, country: data.country });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  return (
    <section className="mb-6">
      <p>No Payroll settings yet. Seed from the property country pack (NG or generic).</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={fieldRowClassName}>
          <SelectComponent
            id="country"
            label="Country of Residence"
            selectWidth="w-2/12"
            register={register('country')}
            error={errors.country}
            options={[
              { value: 'NG', label: 'Nigeria (NG)' },
              { value: 'generic', label: 'Generic' },
            ]}
          />
        </div>
        <Button variant="dark" type="submit">Seed Payroll settings</Button>
      </form>
    </section>
  );
}
