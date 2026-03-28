'use client'

import { useEffect } from 'react';
import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from './validation';
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useSearchParams } from "next/navigation";

type FormData = {
  qtyInStore: number;
  reorderThreshold: number;
};

export function EditStoreInventoryForm({ onSuccess, onClose, inventoryId }: { 
  onSuccess: () => void; 
  onClose: () => void; 
  inventoryId: string;
}) {
  const updateInventory = useMutation(api.storeInventories.updateStoreInventory);

  // Fetch current inventory data
  const inventoryResponse = useQuery(
    api.storeInventories.getStoreInventory,
    { inventoryId: inventoryId as Id<'storeInventories'> }
  );

  const currentInventory = inventoryResponse?.data;

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      qtyInStore: 0,
      reorderThreshold: 0,
    },
  });

  // Set form values when inventory data is loaded
  useEffect(() => {
    if (currentInventory) {
      setValue('qtyInStore', currentInventory.qtyInStore);
      setValue('reorderThreshold', currentInventory.reorderThreshold);
    }
  }, [currentInventory, setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateInventory({
        inventoryId: inventoryId as Id<'storeInventories'>,
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
          window.location.href = '/admin/bar-management/store-inventories';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update store inventory failed:', error);
      toast.error('Failed to update store inventory. Please try again.');
    }
  };

  if (!currentInventory) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div>Loading inventory data...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editStoreInventoryForm">
      {/* Display beverage information (read-only) */}
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="flex-1">
          <label className="block mb-2">Beverage</label>
          <input
            type="text"
            className="w-full border rounded p-2 bg-gray-100"
            value={`${currentInventory.beverage.name} (${currentInventory.beverage.category})`}
            disabled
          />
        </div>
      </div>

      {/* Editable fields */}
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="qtyInStore"
            label="Quantity in Store *"
            type="number"
            inputWidth="w-full"
            register={register('qtyInStore', { 
              required: true, 
              valueAsNumber: true,
              min: 0 
            })}
            error={errors.qtyInStore}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="reorderThreshold"
            label="Reorder Threshold *"
            type="number"
            inputWidth="w-full"
            register={register('reorderThreshold', { 
              required: true, 
              valueAsNumber: true,
              min: 0 
            })}
            error={errors.reorderThreshold}
          />
        </div>
      </div>

      {/* Additional information display */}
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-4">
        <div className="flex-1">
          <label className="block mb-2 text-sm text-gray-600">Last Updated</label>
          <p className="text-sm">
            {new Date(currentInventory.lastUpdated).toLocaleString()}
          </p>
        </div>
        <div className="flex-1">
          <label className="block mb-2 text-sm text-gray-600">Current Stock Status</label>
          <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm text-sm ${
            currentInventory.qtyInStore <= currentInventory.reorderThreshold 
              ? 'bg-red-600' 
              : currentInventory.qtyInStore <= currentInventory.reorderThreshold * 1.5 
                ? 'bg-yellow-600' 
                : 'bg-green-600'
          }`}>
            {currentInventory.qtyInStore <= currentInventory.reorderThreshold 
              ? 'Low Stock' 
              : currentInventory.qtyInStore <= currentInventory.reorderThreshold * 1.5 
                ? 'Reorder Soon' 
                : 'In Stock'
            }
          </p>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Update Inventory
        </Button>
      </div>
    </form>
  );
}
