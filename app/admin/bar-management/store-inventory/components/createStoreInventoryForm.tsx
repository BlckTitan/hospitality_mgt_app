'use client'
import { goToList } from '../../../../../shared/goToList';

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from '../../../../../shared/button';
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
  unitCost?: number;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createStoreInventory = useMutation(api.storeInventories.createStoreInventory);
  const beveragesResponse = useQuery(
    api.beverages.getAllBeverages,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  );
  const inventoryResponse = useQuery(
    api.storeInventories.getAllStoreInventories,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  );
  const beverages = beveragesResponse?.data || [];
  const optionsReady = beveragesResponse !== undefined && inventoryResponse !== undefined;
  const beverageOptions = useMemo(() => {
    const stocked = new Set(
      (inventoryResponse?.success ? inventoryResponse.data ?? [] : []).map((row) => row.beverageId),
    );
    return beverages
      .filter((beverage) => beverage.isActive && !stocked.has(beverage._id))
      .map((beverage) => ({
        value: beverage._id,
        label: `${beverage.name} (${beverage.category}) - ${beverage.unitOfMeasure}`,
      }));
  }, [beverages, inventoryResponse]);

  const currency = usePropertyCurrency(propertyId);
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      beverageId: '',
      qtyInStore: 0,
      reorderThreshold: 10,
      unitCost: undefined,
    },
  });
  const qtyInStore = watch('qtyInStore');
  const unitCost = watch('unitCost');
  const totalCost =
    Number.isFinite(qtyInStore) && Number.isFinite(unitCost) ? qtyInStore * Number(unitCost) : undefined;

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createStoreInventory({
        propertyId: propertyId as Id<'properties'>,
        beverageId: data.beverageId as Id<'beverages'>,
        qtyInStore: data.qtyInStore,
        reorderThreshold: data.reorderThreshold,
        ...(Number.isFinite(data.unitCost) ? { unitCost: data.unitCost } : {}),
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Store inventory created successfully!');
        reset();
        onSuccess();
goToList('/admin/bar-management/store-inventory');
      }
    } catch (error: any) {
      console.error('Add new store inventory failed:', error);
      toast.error('Failed to add new store inventory. Please try again.');
    }
  };

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
            disabled={!optionsReady || beverageOptions.length === 0}
          >
            <option disabled value="">
              {optionsReady ? 'Select a beverage' : 'Loading beverages...'}
            </option>
            {beverageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {optionsReady && beverageOptions.length === 0 && (
            <span className="text-sm text-gray-500">Every active beverage already has store inventory.</span>
          )}
          {errors.beverageId && <span className="text-red-500 text-sm">{errors.beverageId.message}</span>}
        </div>
      </div>

      <div className="mb-4 flex w-full flex-nowrap flex-row items-start gap-3">
        <Field id="qtyInStore" label="Quantity in Store *" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="qtyInStore"
            type="number"
            min={0}
            step="any"
            {...register('qtyInStore', { valueAsNumber: true })}
          />
          {errors.qtyInStore && <span className="text-red-500 text-sm">{errors.qtyInStore.message}</span>}
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
        <Field id="unitCost" label="Unit cost" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="unitCost"
            type="number"
            min={0}
            step="any"
            {...register('unitCost', { valueAsNumber: true })}
          />
          {errors.unitCost && <span className="text-red-500 text-sm">{errors.unitCost.message}</span>}
        </Field>
        <Field id="purchaseTotalCost" label="Total cost" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="purchaseTotalCost"
            readOnly
            value={totalCost === undefined ? '' : formatPropertyMoney(totalCost, currency)}
            className="bg-gray-100"
          />
        </Field>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Enter the quantity purchased and the price paid per unit. Total cost is that quantity times the unit cost. The store keeps the average unit cost of purchases, and stock value is the on-hand quantity times that average.
      </p>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit" disabled={!optionsReady || beverageOptions.length === 0}>
          Create Store Inventory
        </Button>
      </div>
    </form>
  );
}
