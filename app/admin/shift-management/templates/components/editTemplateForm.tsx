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
  isDefault: boolean;
  isActive?: boolean;
};

export default function EditTemplateForm({
  onSuccess,
  onClose,
  templateData,
  templateId,
}: {
  onSuccess: () => void;
  onClose: () => void;
  templateId: string;
  templateData: {
    department: (typeof SHIFT_DEPARTMENTS)[number];
    name: string;
    startTime: string;
    endTime: string;
    isDefault: boolean;
    isActive: boolean;
  };
}) {
  const updateTemplate = useMutation(api.shiftTemplates.updateShiftTemplate);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      department: templateData.department,
      name: templateData.name,
      startTime: templateData.startTime,
      endTime: templateData.endTime,
      isDefault: templateData.isDefault,
      isActive: templateData.isActive,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateTemplate({
        templateId: templateId as Id<'shiftTemplates'>,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        isDefault: data.isDefault,
        isActive: data.isActive,
      });
      if (response.success === false) {
        toast.error(response.message);
        return;
      }
      toast.success(response.message);
      setTimeout(() => {
        onSuccess();
        window.location.href = '/admin/shift-management/templates';
      }, 800);
    } catch (error) {
      console.error('Edit department shift failed:', error);
      toast.error('Failed to update department shift. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editTemplateForm">
      <label className="block mb-3">
        <span className="block text-sm mb-1">Department *</span>
        <select className="w-full border rounded p-2" disabled {...register('department')}>
          {SHIFT_DEPARTMENTS.map((item) => (
            <option key={item} value={item}>{DEPARTMENT_LABELS[item]}</option>
          ))}
        </select>
      </label>
      <div className="mb-3">
        <InputComponent id="name" label="Name *" type="text" inputWidth="w-full" register={register('name')} error={errors.name} />
      </div>
      <div className="mb-3">
        <InputComponent id="startTime" label="Start *" type="time" inputWidth="w-full" register={register('startTime')} error={errors.startTime} />
      </div>
      <div className="mb-3">
        <InputComponent id="endTime" label="End *" type="time" inputWidth="w-full" register={register('endTime')} error={errors.endTime} />
      </div>
      <label className="flex items-center gap-2 mb-3">
        <input type="checkbox" {...register('isDefault')} />
        <span>Default for this department</span>
      </label>
      <label className="flex items-center gap-2 mb-4">
        <input type="checkbox" {...register('isActive')} />
        <span>Active</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Save</Button>
      </div>
    </form>
  );
}
