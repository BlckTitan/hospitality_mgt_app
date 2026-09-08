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
import InputComponent from '../../../../../shared/input';
import SelectComponent from '../../../../../shared/select';
import { extraPayRuleSchema } from './validation';

type FormData = {
  kind: 'daily_overtime' | 'weekend' | 'public_holiday';
  multiplier: number;
};

type ExtraPayRuleRow = {
  _id: string;
  kind: string;
  multiplier: number;
};

export default function ExtraPayRules({
  propertyId,
  extraPayRules,
}: {
  propertyId: Id<'properties'>;
  extraPayRules: ExtraPayRuleRow[];
}) {
  const createExtraPayRule = useMutation(api.payrollConfig.createExtraPayRule);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(extraPayRuleSchema) as any,
    defaultValues: { kind: 'weekend', multiplier: 1.5 },
  });
  const selectedKind = watch('kind');
  const existingRule = extraPayRules.find((row) => row.kind === selectedKind);

  useEffect(() => {
    setValue('multiplier', existingRule?.multiplier ?? 1.5);
  }, [existingRule?.multiplier, selectedKind, setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const result = await createExtraPayRule({
      propertyId,
      kind: data.kind,
      multiplier: data.multiplier,
    });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  return (
    <section className="mb-6">
      <h4>Extra pay rules</h4>
      <p className="text-sm text-gray-600 mb-2">
        One rule per kind. Change the multiplier to update overtime, weekend, or public-holiday pay.
      </p>
      <ul>
        {extraPayRules.map((row) => (
          <li key={row._id}>{row.kind} × {row.multiplier}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={fieldRowClassName}>
          <SelectComponent
            id="ruleKind"
            label="Rule"
            selectWidth="w-2/12"
            register={register('kind')}
            error={errors.kind}
            options={[
              { value: 'daily_overtime', label: 'Daily overtime' },
              { value: 'weekend', label: 'Weekend' },
              { value: 'public_holiday', label: 'Public holiday' },
            ]}
          />
          <InputComponent
            id="ruleMultiplier"
            label="Multiplier"
            type="number"
            inputWidth="w-2/12"
            step={0.1}
            register={register('multiplier', { valueAsNumber: true })}
            error={errors.multiplier}
          />
        </div>
        <Button variant="dark" type="submit">
          {existingRule ? 'Update Extra pay rule' : 'Save Extra pay rule'}
        </Button>
      </form>
    </section>
  );
}
