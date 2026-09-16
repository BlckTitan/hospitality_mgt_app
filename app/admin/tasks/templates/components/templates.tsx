'use client'

import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { formSchema } from './validation';
import InputComponent from '../../../../../shared/input';

const MODULES = ['housekeeping', 'maintenance', 'inventory'] as const;

type FormData = {
  module: (typeof MODULES)[number];
  typeKey: string;
  stepsText: string;
};

export default function TaskTemplatesComponent() {
  const { isAuthenticated } = useConvexAuth();
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const propertyId = propertiesResponse?.data?.[0]?._id as Id<'properties'> | undefined;
  const templates = useQuery(
    api.taskConfig.listTemplates,
    isAuthenticated && propertyId ? { propertyId } : 'skip',
  );
  const upsert = useMutation(api.taskConfig.upsertTemplate);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      module: 'housekeeping',
      typeKey: 'checkout',
      stepsText: 'Towels\nBathroom\nBeds',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!propertyId) return;
    const steps = data.stepsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, index) => ({ id: `step-${index + 1}`, label }));
    const result = await upsert({
      propertyId,
      module: data.module,
      typeKey: data.typeKey,
      steps,
      isActive: true,
    });
    if (result.success) toast.success(result.message);
    else toast.error('Failed to save template');
  };

  if (propertiesResponse === undefined) {
    return <p className="p-4">Loading</p>;
  }

  if (!propertiesResponse?.data?.length) {
    return <p className="p-4">No properties yet!</p>;
  }

  return (
    <div className="w-full h-full">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 max-w-xl mb-6">
        <div>
          <label htmlFor="module" className="block mb-2">Module</label>
          <select id="module" {...register('module')} className="w-full border rounded p-2">
            {MODULES.map((module) => <option key={module} value={module}>{module}</option>)}
          </select>
          {errors.module && <span className="text-red-500 text-sm">{errors.module.message}</span>}
        </div>
        <InputComponent
          id="typeKey"
          label="Type key"
          type="text"
          inputWidth="w-full"
          placeholder="e.g. checkout"
          register={register('typeKey')}
          error={errors.typeKey}
        />
        <div>
          <label htmlFor="stepsText" className="block mb-2">Checklist steps (one per line)</label>
          <textarea id="stepsText" {...register('stepsText')} rows={6} className="w-full border rounded p-2" />
          {errors.stepsText && <span className="text-red-500 text-sm">{errors.stepsText.message}</span>}
        </div>
        <Button type="submit" variant="dark">Save template</Button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Module</th>
              <th className="p-2">Type</th>
              <th className="p-2">Steps</th>
            </tr>
          </thead>
          <tbody>
            {(templates?.data ?? []).length === 0 && (
              <tr>
                <td className="p-3" colSpan={3}>No templates yet.</td>
              </tr>
            )}
            {(templates?.data ?? []).map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.module}</td>
                <td className="p-2">{row.typeKey}</td>
                <td className="p-2">{row.steps.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
