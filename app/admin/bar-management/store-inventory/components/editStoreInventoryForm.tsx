'use client'
import { goToList } from '../../../../../shared/goToList';

import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { editFormSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from '../../../../../shared/button';
import { useEffect } from "react";
import { Field } from "../../../../../shared/field";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { formatPropertyMoney, usePropertyCurrency } from "../../../inventory-management/components/money";

const alignedLabel = "mb-1 flex w-full min-h-12 items-end leading-snug";
const alignedField = "min-w-0 flex-1";

type FormData = {
  beverageId: string;
  qtyInStore: number;
  reorderThreshold: number;
};

export function EditFormComponent({ onSuccess, onClose, inventoryId }: { onSuccess: () => void; onClose: () => void; inventoryId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const updateStoreInventory = useMutation(api.storeInventories.updateStoreInventory);
  const storeInventoryResponse = useQuery(
    api.storeInventories.getStoreInventoryById,
    isAuthenticated && inventoryId ? { id: inventoryId as Id<'storeInventories'> } : 'skip',
  );
  const storeInventory = storeInventoryResponse;

  const currency = usePropertyCurrency(storeInventory?.success ? storeInventory.data?.propertyId : undefined);
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: yupResolver(editFormSchema) as any,
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
        onSuccess();
goToList('/admin/bar-management/store-inventory');
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

      <div className="mb-4 flex w-full flex-nowrap flex-row items-start gap-3">
        <Field id="qtyInStoreDisplay" label="Quantity in Store" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="qtyInStoreDisplay"
            type="number"
            value={inventory.qtyInStore}
            disabled
            readOnly
            className="bg-gray-100"
          />
        </Field>
        <Field id="reorderThreshold" label="Reorder Threshold *" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="reorderThreshold"
            type="number"
            min={0}
            step="any"
            {...register('reorderThreshold', { valueAsNumber: true })}
          />
          {errors.reorderThreshold && <span className="text-red-500 text-sm">{errors.reorderThreshold.message}</span>}
        </Field>
      </div>

      <div className="mb-1 flex w-full flex-nowrap flex-row items-start gap-3">
        <Field id="unitCostDisplay" label="Bottle cost" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="unitCostDisplay"
            readOnly
            value={formatPropertyMoney(inventory.unitCost, currency)}
            className="bg-gray-100"
          />
        </Field>
        <Field id="stockValueDisplay" label="Stock value" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="stockValueDisplay"
            readOnly
            value={
              inventory.unitCost === undefined
                ? ''
                : formatPropertyMoney(inventory.qtyInStore * inventory.unitCost, currency)
            }
            className="bg-gray-100"
          />
        </Field>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Quantity changes through a crate purchase or an issue. Bottle cost is the average landed cost: crate price plus supply costs such as transportation, divided by the bottles. Stock value is the bottles on hand times that cost. A manual unit cost on the beverage overrides it for bar profit.
      </p>

      <p className="text-sm text-gray-500 mb-4">
        Last updated: {new Date(inventory.lastUpdated).toLocaleString()}
      </p>

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
