'use client';

import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  name: string;
  category: string;
  unitOfMeasure: string;
  unitPrice: number;
  reorderLevel: number;
  isActive: boolean;
};

interface EditBeverageFormProps {
  beverageData: any;
  beverageId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditBeverageForm({ beverageData, beverageId, onSuccess, onClose }: EditBeverageFormProps) {
  const updateBeverage = useMutation(api.beverages.updateBeverage);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: beverageData.name || '',
      category: beverageData.category || '',
      unitOfMeasure: beverageData.unitOfMeasure || '',
      unitPrice: beverageData.unitPrice || 0,
      reorderLevel: beverageData.reorderLevel || 0,
      isActive: beverageData.isActive ?? true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateBeverage({
        beverageId: beverageId as Id<'beverages'>,
        name: data.name,
        category: data.category,
        unitOfMeasure: data.unitOfMeasure,
        unitPrice: data.unitPrice,
        reorderLevel: data.reorderLevel,
        isActive: data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Beverage updated successfully!');
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/bar-management/beverages';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update beverage failed:', error);
      toast.error('Failed to update beverage. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editBeverageForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="name" label="Beverage Name *" type="text" inputWidth="w-full" register={register('name', { required: true })} error={errors.name} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="category" label="Category *" type="text" inputWidth="w-full" register={register('category', { required: true })} error={errors.category} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="unitOfMeasure" label="Unit of Measure *" type="text" inputWidth="w-full" register={register('unitOfMeasure', { required: true })} error={errors.unitOfMeasure} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="unitPrice" label="Unit Price *" type="number" inputWidth="w-full" register={register('unitPrice', { valueAsNumber: true })} error={errors.unitPrice} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="reorderLevel" label="Reorder Level *" type="number" inputWidth="w-full" register={register('reorderLevel', { valueAsNumber: true })} error={errors.reorderLevel} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isActive')} defaultChecked={beverageData.isActive ?? true} className="mr-2 w-4 h-3" />
          <span>Active</span>
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Update Beverage</Button>
      </div>
    </form>
  );
}
