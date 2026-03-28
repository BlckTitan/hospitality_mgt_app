'use client'

import {useEffect} from 'react';
import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { formSchema } from './validation';

type FormData = {
  beverageId: string;
  qtyInStore: number;
  reorderThreshold: number;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { 
  onSuccess: () => void; 
  onClose: () => void; 
  propertyId: string;
}) {
  const createInventory = useMutation(api.storeInventories.createStoreInventory);
  const updateInventory = useMutation(api.storeInventories.updateStoreInventory);
  const searchParams = useSearchParams();

  const inventoryId = searchParams.get('inventory_id');
  const isEdit = !!inventoryId;

  // Fetch available beverages (for create) or current inventory (for edit)
  const availableBeveragesResponse = useQuery(
    api.storeInventories.getBeveragesWithoutInventory, 
    propertyId ? { propertyId: propertyId as Id<'properties'> } : "skip"
  );
  const inventoryResponse = useQuery( 
    api.storeInventories.getStoreInventory,
    inventoryId ? { inventoryId: inventoryId as Id<'storeInventories'> } : "skip"
  );

  const availableBeverages = availableBeveragesResponse?.data || [];
  const currentInventory = inventoryResponse?.data;

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      beverageId: '',
      qtyInStore: 0,
      reorderThreshold: 0,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (isEdit && currentInventory) {
      setValue('beverageId', currentInventory.beverageId);
      setValue('qtyInStore', currentInventory.qtyInStore);
      setValue('reorderThreshold', currentInventory.reorderThreshold);
    }
  }, [isEdit, currentInventory, setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      let response;
      
      if (isEdit) {
        response = await updateInventory({
          inventoryId: inventoryId as Id<'storeInventories'>,
          qtyInStore: data.qtyInStore,
          reorderThreshold: data.reorderThreshold,
        });
      } else {
        response = await createInventory({
          propertyId: propertyId as Id<'properties'>,
          beverageId: data.beverageId as Id<'beverages'>,
          qtyInStore: data.qtyInStore,
          reorderThreshold: data.reorderThreshold,
        });
      }

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success(`Store inventory ${isEdit ? 'updated' : 'created'} successfully!`);
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/bar-management/store-inventory';
        }, 1500);
      }
    } catch (error: any) {
      console.error(`${isEdit ? 'Update' : 'Add'} store inventory failed:`, error);
      toast.error(`Failed to ${isEdit ? 'update' : 'add'} store inventory. Please try again.`);
    }
  };

  const beverageOptions = availableBeverages
    .filter((beverage: any) => beverage.isActive)
    .map((beverage: any) => ({
      value: beverage._id,
      label: `${beverage.name} (${beverage.category}) - $${beverage.unitPrice}/${beverage.unitOfMeasure}`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createStoreInventoryForm">
      {!isEdit && (
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
      )}

      {isEdit && currentInventory?.beverage && (
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
      )}

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

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          {isEdit ? 'Update Inventory' : 'Create Inventory'}
        </Button>
      </div>
    </form>
  );
}
