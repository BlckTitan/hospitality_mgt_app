'use client'

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import { useEffect } from "react";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  beverageId: string;
  qtyInStore: number;
  reorderThreshold: number;
};

export function EditFormComponent({ onSuccess, onClose, inventoryId }: { onSuccess: () => void; onClose: () => void; inventoryId: string }) {
  const updateStoreInventory = useMutation(api.storeInventories.updateStoreInventory);
  const storeInventoryResponse = useQuery(api.storeInventories.getStoreInventoryById, { id: inventoryId as Id<'storeInventories'> });
  const storeInventory = storeInventoryResponse;

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      beverageId: '',
      qtyInStore: 0,
      reorderThreshold: 10,
    },
  });

  useEffect(() => {
    if (storeInventory?.success && storeInventory?.data) {
      setValue('beverageId', storeInventory.data.beverageId);
      setValue('qtyInStore', storeInventory.data.qtyInStore);
      setValue('reorderThreshold', storeInventory.data.reorderThreshold);
    }
  }, [storeInventory, setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateStoreInventory({
        id: inventoryId as Id<'storeInventories'>,
        qtyInStore: data.qtyInStore,
        reorderThreshold: data.reorderThreshold,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Store inventory updated successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/bar-management/store-inventory';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update store inventory failed:', error);
      toast.error('Failed to update store inventory. Please try again.');
    }
  };

  if (!storeInventory?.success || !storeInventory?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  const inventory = storeInventory.data;
  const beverage = inventory.beverage;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editStoreInventoryForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="beverageId" className="block mb-2">Beverage</label>
          <input
            id="beverageId"
            {...register('beverageId')}
            className="w-full border rounded p-2 bg-gray-100"
            value={beverage?.name || ''}
            disabled
            readOnly
          />
          <div className="text-sm text-gray-500 mt-1">
            {beverage?.category} - {beverage?.unitOfMeasure}
          </div>
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
          <p>• Last Updated: {new Date(inventory.lastUpdated).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Update Store Inventory
        </Button>
      </div>
    </form>
  );
}
