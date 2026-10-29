'use client'

import { useMutation } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'sonner';
import { Button } from '../../../../../shared/button';
import InputComponent from '../../../../../shared/input';
import { Id } from '../../../../../convex/_generated/dataModel';
import { api } from '../../../../../convex/_generated/api';
import { DEPARTMENT_LABELS, formSchema, SHIFT_DEPARTMENTS } from './validation';

type FormData = {
  department: (typeof SHIFT_DEPARTMENTS)[number];
  name: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  durationMinutesPart: number;
  isDefault: boolean;
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
  const createTemplate = useMutation(api.shiftTemplates.createShiftTemplate);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      department: 'front-office',
      name: '',
      startTime: '08:00',
      endTime: '16:00',
      durationHours: 8,
      durationMinutesPart: 0,
      isDefault: true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createTemplate({
        propertyId: propertyId as Id<'properties'>,
        department: data.department,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: Number(data.durationHours) * 60 + Number(data.durationMinutesPart),
        isDefault: data.isDefault,
      });
      if (response.success === false) {
        toast.error(response.message);
        return;
      }
      toast.success(response.message);
      onSuccess();
    } catch (error) {
      console.error('Add department shift failed:', error);
      toast.error('Failed to add department shift. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createTemplateForm">
      <label className="block mb-3">
        <span className="block text-sm mb-1">Department *</span>
        <select className="w-full border rounded p-2" {...register('department')}>
          {SHIFT_DEPARTMENTS.map((item) => (
            <option key={item} value={item}>{DEPARTMENT_LABELS[item]}</option>
          ))}
        </select>
        {errors.department && <p className="text-red-500 text-sm">{errors.department.message}</p>}
      </label>
      <div className="mb-3">
        <InputComponent id="name" label="Name *" type="text" inputWidth="w-full" register={register('name')} error={errors.name} />
      </div>
      <div className="mb-3">
        <InputComponent id="startTime" label="Start *" type="time" inputWidth="w-full" register={register('startTime')} error={errors.startTime} />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <InputComponent id="durationHours" label="Length (hours) *" type="number" inputWidth="w-full" register={register('durationHours', { valueAsNumber: true })} error={errors.durationHours} />
        <InputComponent id="durationMinutesPart" label="Length (minutes)" type="number" inputWidth="w-full" register={register('durationMinutesPart', { valueAsNumber: true })} error={errors.durationMinutesPart} />
      </div>
      <p className="text-sm text-gray-600 mb-3">Use 24 hours for one day on, or 36 hours for one and a half days. End time is the clock when that length finishes.</p>
      <label className="flex items-center gap-2 mb-4">
        <input type="checkbox" {...register('isDefault')} />
        <span>Default for this department</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Save</Button>
      </div>
    </form>
  );
}
