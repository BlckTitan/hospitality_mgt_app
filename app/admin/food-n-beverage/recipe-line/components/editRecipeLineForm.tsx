'use client';

import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button, Modal } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { RecipeLineValidationSchema } from "./validation";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";

type FormData = {
  quantity: number;
  unit: string;
  wastePercent?: number;
};

interface RecipeLineData {
  _id: string;
  quantity: number;
  unit: string;
  wastePercent?: number;
  inventoryItem?: {
    _id: string;
    name: string;
  };
}

export function EditRecipeLineForm({ 
  onSuccess, 
  onClose, 
  recipeLine 
}: { 
  onSuccess?: () => void; 
  onClose?: () => void; 
  recipeLine: RecipeLineData 
}) {
  const updateRecipeLine = useMutation(api.recipes.updateRecipeLine);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(RecipeLineValidationSchema) as any,
    defaultValues: {
      quantity: recipeLine.quantity,
      unit: recipeLine.unit,
      wastePercent: recipeLine.wastePercent || 0,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateRecipeLine({
        recipeLineId: recipeLine._id as Id<'recipeLines'>,
        quantity: data.quantity,
        unit: data.unit,
        wastePercent: data.wastePercent,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("Recipe ingredient updated successfully!");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error: any) {
      console.error("Update recipe line failed:", error);
      toast.error("Failed to update recipe ingredient. Please try again.");
    }
  };

  const unitOptions = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (l)' },
    { value: 'cup', label: 'Cup' },
    { value: 'tbsp', label: 'Tablespoon (tbsp)' },
    { value: 'tsp', label: 'Teaspoon (tsp)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'lb', label: 'Pounds (lb)' },
    { value: 'piece', label: 'Piece' },
    { value: 'batch', label: 'Batch' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='editRecipeLineForm'>
      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <div className="flex-1 w-full">
          <label htmlFor="ingredientName" className="block mb-2">Ingredient</label>
          <input
            id="ingredientName"
            type="text"
            value={recipeLine.inventoryItem?.name || 'N/A'}
            disabled
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='quantity'
          label='Quantity *'
          type='number'
          inputWidth='w-1/2'
          placeholder="e.g., 250"
          register={register("quantity", { required: true, valueAsNumber: true })}
          error={errors.quantity}
        />

        <div className="flex-1 w-1/2">
          <label htmlFor="unit" className="block mb-2">Unit *</label>
          <select
            id="unit"
            {...register('unit', { required: true })}
            className="w-full border rounded p-2"
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.unit && <span className="text-red-500 text-sm">{errors.unit.message}</span>}
        </div>
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='wastePercent'
          label='Waste Percent (%)'
          type='number'
          inputWidth='w-full'
          placeholder="e.g., 5"
          register={register("wastePercent", { valueAsNumber: true })}
          error={errors.wastePercent}
        />
      </div>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant='dark'>Update Ingredient</Button>
      </Modal.Footer>
    </form>
  );
}
