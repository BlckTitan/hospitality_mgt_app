'use client'
import { goToList } from '../../../../../shared/goToList';

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from '../../../../../shared/button';
import { Field } from "../../../../../shared/field";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { usePropertyCurrency } from "../../../inventory-management/components/money";
import { cratePurchaseError, landedCratePurchase } from "../../../../../lib/crateCost";
import {
  CratePurchaseFields,
  blankSupplyCosts,
  supplyCostsFromDrafts,
  type SupplyCostDraft,
} from "../../components/cratePurchaseFields";

const alignedLabel = "mb-1 flex w-full min-h-12 items-end leading-snug";
const alignedField = "min-w-0 flex-1";

type FormData = {
  beverageId: string;
  packQty: number;
  packPrice?: number;
  unitsPerPack?: number;
  reorderThreshold: number;
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
  const [supplyCosts, setSupplyCosts] = useState<SupplyCostDraft[]>(blankSupplyCosts());
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      beverageId: '',
      packQty: 0,
      packPrice: undefined,
      unitsPerPack: undefined,
      reorderThreshold: 10,
    },
  });
  const beverageId = watch('beverageId');
  const packQty = watch('packQty');
  const packPrice = watch('packPrice');
  const unitsPerPack = watch('unitsPerPack');
  const selected = beverages.find((beverage) => beverage._id === beverageId);
  const unitsPerPackLocked = typeof selected?.unitsPerPack === 'number';

  useEffect(() => {
    if (typeof selected?.unitsPerPack === 'number') {
      setValue('unitsPerPack', selected.unitsPerPack);
    }
  }, [selected?._id, selected?.unitsPerPack, setValue]);

  const preview = useMemo(() => {
    const result = landedCratePurchase({
      packQty: Number(packQty),
      packPrice: Number(packPrice),
      unitsPerPack: Number(unitsPerPack),
      supplyCosts: supplyCostsFromDrafts(supplyCosts),
    });
    return cratePurchaseError(result) ? null : result;
  }, [packQty, packPrice, unitsPerPack, supplyCosts]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      let receipt: { packPrice: number; unitsPerPack: number; supplyCosts: { label: string; amount: number }[] } | null = null;
      if (data.packQty > 0) {
        const purchase = landedCratePurchase({
          packQty: data.packQty,
          packPrice: Number(data.packPrice),
          unitsPerPack: Number(data.unitsPerPack),
          supplyCosts: supplyCostsFromDrafts(supplyCosts),
        });
        if (cratePurchaseError(purchase)) {
          toast.error(purchase.error);
          return;
        }
        receipt = {
          packPrice: purchase.packPrice,
          unitsPerPack: purchase.unitsPerPack,
          supplyCosts: purchase.supplyCosts,
        };
      }
      const response = await createStoreInventory({
        propertyId: propertyId as Id<'properties'>,
        beverageId: data.beverageId as Id<'beverages'>,
        packQty: data.packQty,
        reorderThreshold: data.reorderThreshold,
        ...(receipt ?? {}),
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Store inventory created successfully!');
        reset();
        setSupplyCosts(blankSupplyCosts());
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

      <div className="mb-4">
        <Field id="reorderThreshold" label="Reorder threshold (bottles) *" widthClass={alignedField} labelClassName={alignedLabel}>
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

      <CratePurchaseFields
        register={register}
        errors={errors}
        currency={currency}
        unitsPerPackLocked={unitsPerPackLocked}
        supplyCosts={supplyCosts}
        onSupplyCostsChange={setSupplyCosts}
        preview={preview}
        crateLabel="Crates in store *"
      />
      <p className="text-xs text-gray-500 mb-4">
        Enter 0 crates to track the drink with no opening stock. Otherwise the store keeps bottles, and the bottle cost is the crate price plus supply costs, divided by the bottles in the crates. Later purchases update the average. Bar profit uses that cost unless the beverage has a manual unit cost.
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
