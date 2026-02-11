'use client';

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button, Modal } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { RecipeLineValidationSchema } from "./validation";
import InputComponent from "../../../../../shared/input";


type FormData = {
  inventoryItemId: string;
  quantity: number;
  unit: string;
  wastePercent?: number;
};

export function CreateRecipeLineForm({ 
  onSuccess, 
  onClose, 
  recipeId,
  propertyId
}: { 
  onSuccess?: () => void; 
  onClose?: () => void; 
  recipeId: string;
  propertyId: string;
}) {
  const createRecipeLine = useMutation(api.recipes.createRecipeLine);
  const inventoryItemsResponse = useQuery(api.inventoryItems.getAllInventoryItems, propertyId ? { propertyId: propertyId as Id<'properties'> } : null);
  const inventoryItems = inventoryItemsResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(RecipeLineValidationSchema) as any,
    defaultValues: {
      inventoryItemId: '',
      quantity: 1,
      unit: '',
      wastePercent: 0,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createRecipeLine({
        recipeId: recipeId as Id<'recipes'>,
        inventoryItemId: data.inventoryItemId as Id<'inventoryItems'>,
        quantity: data.quantity,
        unit: data.unit,
        wastePercent: data.wastePercent,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("Recipe ingredient added successfully!");
        reset();
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error: any) {
      console.error("Add recipe line failed:", error);
      toast.error("Failed to add recipe ingredient. Please try again.");
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

  const inventoryOptions = inventoryItems
    .filter((item: any) => item.isActive)
    .map((item: any) => ({
      value: item._id,
      label: `${item.name} (${item.unit})`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createRecipeLineForm'>
      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <div className="flex-1 w-full">
          <label htmlFor="inventoryItemId" className="block mb-2">Ingredient *</label>
          <select
            id="inventoryItemId"
            {...register('inventoryItemId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select an ingredient</option>
            {inventoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.inventoryItemId && <span className="text-red-500 text-sm">{errors.inventoryItemId.message}</span>}
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
            defaultValue=""
          >
            <option disabled value="">Select a unit</option>
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
        <Button type="submit" variant='dark'>Add Ingredient</Button>
      </Modal.Footer>
    </form>
  );
}
