'use client'

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  beverageId: string;
  qtyInStore: number;
  reorderThreshold: number;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createStoreInventory = useMutation(api.storeInventories.createStoreInventory);
  const beveragesResponse = useQuery(api.beverages.getAllBeverages, { propertyId: propertyId as Id<'properties'> });
  const beverages = beveragesResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      beverageId: '',
      qtyInStore: 0,
      reorderThreshold: 10,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createStoreInventory({
        propertyId: propertyId as Id<'properties'>,
        beverageId: data.beverageId as Id<'beverages'>,
        qtyInStore: data.qtyInStore,
        reorderThreshold: data.reorderThreshold,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Store inventory created successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/bar-management/store-inventory';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Add new store inventory failed:', error);
      toast.error('Failed to add new store inventory. Please try again.');
    }
  };

  const beverageOptions = beverages
    .filter((beverage: any) => beverage.isActive)
    .map((beverage: any) => ({
      value: beverage._id,
      label: `${beverage.name} (${beverage.category}) - ${beverage.unitOfMeasure}`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createStoreInventoryForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="beverageId" className="block mb-2">Beverage *</label>
          <select
            id="beverageId"
            {...register('beverageId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a beverage</option>
            {beverageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.beverageId && <span className="text-red-500 text-sm">{errors.beverageId.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="qtyInStore"
            label="Quantity in Store *"
            type="number"
            inputWidth="w-full"
            register={register('qtyInStore', { valueAsNumber: true, min: 0 })}
            error={errors.qtyInStore}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="reorderThreshold"
            label="Reorder Threshold *"
            type="number"
            inputWidth="w-full"
            register={register('reorderThreshold', { valueAsNumber: true, min: 0 })}
            error={errors.reorderThreshold}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <div className="text-sm text-gray-500">
          <p>• Quantity in Store: Current stock quantity available in the store</p>
          <p>• Reorder Threshold: Minimum quantity before reorder alert is triggered</p>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Create Store Inventory
        </Button>
      </div>
    </form>
  );
}
