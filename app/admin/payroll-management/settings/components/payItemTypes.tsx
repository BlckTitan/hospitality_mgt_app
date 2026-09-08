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
import SelectComponent from '../../../../../shared/select';
import { payItemTypeSchema, sameName } from './validation';

type FormData = {
  code: string;
  name: string;
  kind: 'earning' | 'allowance' | 'deduction';
  defaultAmount: number;
};

type PayItemTypeRow = {
  _id: string;
  code: string;
  name: string;
  kind: string;
  source: string;
};

export default function PayItemTypes({
  propertyId,
  payItemTypes,
}: {
  propertyId: Id<'properties'>;
  payItemTypes: PayItemTypeRow[];
}) {
  const createPayItemType = useMutation(api.payrollConfig.createPayItemType);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(payItemTypeSchema) as any,
    defaultValues: { code: '', name: '', kind: 'allowance', defaultAmount: 0 },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (payItemTypes.some((row) => row.code === data.code)) {
      toast.error('A Pay item type with this code already exists');
      return;
    }
    if (payItemTypes.some((row) => sameName(row.name, data.name))) {
      toast.error('A Pay item type with this name already exists');
      return;
    }
    const result = await createPayItemType({
      propertyId,
      code: data.code,
      name: data.name,
      kind: data.kind,
      calculation: 'flat',
      defaultAmount: data.defaultAmount,
    });
    if (result.success === false) toast.error(result.message);
    else {
      toast.success(result.message);
      reset({ code: '', name: '', kind: 'allowance', defaultAmount: 0 });
    }
  };

  return (
    <section className="mb-6">
      <h4>Pay item types</h4>
      <p className="text-sm text-gray-600 mb-2">
        Reusable earnings and deductions added on Prepare pay (e.g. Housing, PAYE, Transport).
      </p>
      <ul>
        {payItemTypes.map((row) => (
          <li key={row._id}>{row.code} — {row.name} ({row.kind}, {row.source})</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={fieldRowClassName}>
          <InputComponent
            id="itemCode"
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
            id="itemName"
            label="Name"
            type="text"
            inputWidth="w-4/12"
            placeholder="Name"
            register={register('name')}
            error={errors.name}
          />
          <SelectComponent
            id="itemKind"
            label="Kind"
            selectWidth="w-2/12"
            register={register('kind')}
            error={errors.kind}
            options={[
              { value: 'earning', label: 'Earning' },
              { value: 'allowance', label: 'Allowance' },
              { value: 'deduction', label: 'Deduction' },
            ]}
          />
        </div>
        <div className={fieldRowClassName}>
          <InputComponent
            id="itemAmount"
            label="Flat amount"
            type="number"
            inputWidth="w-2/12"
            placeholder="Flat amount"
            register={register('defaultAmount', { valueAsNumber: true })}
            error={errors.defaultAmount}
          />
        </div>
        <Button variant="dark" type="submit">Add Pay item type</Button>
      </form>
    </section>
  );
}
