'use client'
import { goToList } from '../../../../../shared/goToList';

import { useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { editFormSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from '../../../../../shared/button';
import { Field } from "../../../../../shared/field";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { formatPropertyMoney, usePropertyCurrency } from "../../../inventory-management/components/money";
import { cratePurchaseError, landedCratePurchase } from "../../../../../lib/crateCost";
import {
  CratePurchaseFields,
  supplyCostDrafts,
  supplyCostsFromDrafts,
  type SupplyCostDraft,
} from "../../components/cratePurchaseFields";

const alignedLabel = "mb-1 flex w-full min-h-12 items-end leading-snug";
const alignedField = "min-w-0 flex-1";

type FormData = {
  beverageId: string;
  barId?: string;
  txnType: 'receive' | 'issue';
  qty?: number;
  unitCost?: number;
  packQty?: number;
  packPrice?: number;
  unitsPerPack?: number;
  notes?: string;
};

export function EditStoreTransactionForm({
  transactionData,
  transactionId,
  onSuccess,
  onClose
}: {
  transactionData: any;
  transactionId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const updateTransaction = useMutation(api.storeTransactions.updateStoreTransaction);
  const { isAuthenticated } = useConvexAuth();
  const propertyArgs = isAuthenticated && transactionData.propertyId
    ? { propertyId: transactionData.propertyId as Id<'properties'> }
    : 'skip';
  const beveragesResponse = useQuery(api.beverages.getAllBeverages, propertyArgs);
  const barsResponse = useQuery(api.bars.getAllBars, propertyArgs);

  const beverages = beveragesResponse?.data || [];
  const bars = barsResponse?.data || [];
  const legacyReceive = transactionData.txnType === 'receive' && transactionData.packQty === undefined;

  const currency = usePropertyCurrency(transactionData.propertyId);
  const [supplyCosts, setSupplyCosts] = useState<SupplyCostDraft[]>(supplyCostDrafts(transactionData.supplyCosts));
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: yupResolver(editFormSchema) as any,
    defaultValues: {
      beverageId: transactionData.beverageId || '',
      barId: transactionData.barId || '',
      txnType: transactionData.txnType || 'receive',
      qty: transactionData.qty || 1,
      unitCost: transactionData.unitCost,
      packQty: transactionData.packQty ?? (legacyReceive ? transactionData.qty : 1),
      packPrice: transactionData.packPrice ?? (legacyReceive ? transactionData.unitCost : undefined),
      unitsPerPack: transactionData.unitsPerPack ?? transactionData.beverage?.unitsPerPack ?? (legacyReceive ? 1 : undefined),
      notes: transactionData.notes || '',
    },
  });

  const watchedTxnType = watch('txnType');
  const beverageId = watch('beverageId');
  const qty = watch('qty');
  const unitCost = watch('unitCost');
  const packQty = watch('packQty');
  const packPrice = watch('packPrice');
  const unitsPerPack = watch('unitsPerPack');
  const selected = beverages.find((beverage) => beverage._id === beverageId) ?? transactionData.beverage;
  const catalogReceive = watchedTxnType === 'receive' && Boolean(selected?.inventoryItemId);
  const crateReceive = watchedTxnType === 'receive' && !catalogReceive;
  const unitsPerPackLocked = !legacyReceive && typeof selected?.unitsPerPack === 'number';
  const catalogTotal =
    Number.isFinite(qty) && Number.isFinite(unitCost) ? Number(qty) * Number(unitCost) : undefined;

  useEffect(() => {
    if (!crateReceive || legacyReceive || typeof selected?.unitsPerPack !== 'number') return;
    setValue('unitsPerPack', selected.unitsPerPack);
  }, [crateReceive, legacyReceive, selected?._id, selected?.unitsPerPack, setValue]);

  const preview = useMemo(() => {
    if (!crateReceive) return null;
    const result = landedCratePurchase({
      packQty: Number(packQty),
      packPrice: Number(packPrice),
      unitsPerPack: Number(unitsPerPack),
      supplyCosts: supplyCostsFromDrafts(supplyCosts),
    });
    return cratePurchaseError(result) ? null : result;
  }, [crateReceive, packQty, packPrice, unitsPerPack, supplyCosts]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const drink = beverages.find((beverage) => beverage._id === data.beverageId) ?? selected;
      const linked = data.txnType === 'receive' && Boolean(drink?.inventoryItemId);
      if (linked) {
        toast.error('This drink is linked to a storeroom item. Delete this transaction and record a new receipt.');
        return;
      }
      const purchase = data.txnType === 'receive'
        ? landedCratePurchase({
            packQty: Number(data.packQty),
            packPrice: Number(data.packPrice),
            unitsPerPack: Number(data.unitsPerPack),
            supplyCosts: supplyCostsFromDrafts(supplyCosts),
          })
        : null;
      if (purchase && cratePurchaseError(purchase)) {
        toast.error(purchase.error);
        return;
      }

      const response = await updateTransaction({
        transactionId: transactionId as Id<'storeTransactions'>,
        beverageId: data.beverageId as Id<'beverages'>,
        barId: data.barId ? data.barId as Id<'bars'> : undefined,
        txnType: data.txnType,
        ...(data.txnType === 'issue' ? { qty: data.qty } : {}),
        ...(purchase && !cratePurchaseError(purchase)
          ? {
              packQty: purchase.packQty,
              packPrice: purchase.packPrice,
              unitsPerPack: purchase.unitsPerPack,
              supplyCosts: purchase.supplyCosts,
            }
          : {}),
        notes: data.notes,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Store transaction updated successfully!');
        onSuccess();
        goToList('/admin/bar-management/store-transactions');
      }
    } catch (error: any) {
      console.error('Update store transaction failed:', error);
      toast.error('Failed to update store transaction. Please try again.');
    }
  };

  const beverageOptions = beverages
    .filter((b: any) => b.isActive)
    .map((b: any) => ({
      value: b._id,
      label: `${b.name} (${b.category})`,
    }));

  const barOptions = bars
    .filter((b: any) => b.isActive)
    .map((b: any) => ({
      value: b._id,
      label: `${b.name} - ${b.location}`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editStoreTransactionForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="beverageId" className="block mb-2">Beverage *</label>
          <select
            id="beverageId"
            {...register('beverageId', { required: true })}
            className="w-full border rounded p-2"
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

      <div className="mb-4 flex w-full flex-nowrap flex-row items-start gap-3">
        {watchedTxnType === 'issue' && (
          <Field id="qty" label="Bottles *" widthClass={alignedField} labelClassName={alignedLabel}>
            <input
              id="qty"
              type="number"
              min={1}
              step="any"
              {...register('qty', { valueAsNumber: true })}
            />
            {errors.qty && <span className="text-red-500 text-sm">{errors.qty.message}</span>}
          </Field>
        )}
        <Field id="txnType" label="Transaction Type *" widthClass={alignedField} labelClassName={alignedLabel}>
          <select id="txnType" {...register('txnType', { required: true })}>
            <option value="receive">Receive (Stock In)</option>
            <option value="issue">Issue (Stock Out)</option>
          </select>
          {errors.txnType && <span className="text-red-500 text-sm">{errors.txnType.message}</span>}
        </Field>
      </div>

      {crateReceive && (
        <>
          <CratePurchaseFields
            register={register}
            errors={errors}
            currency={currency}
            unitsPerPackLocked={unitsPerPackLocked}
            supplyCosts={supplyCosts}
            onSupplyCostsChange={setSupplyCosts}
            preview={preview}
            crateLabel="Crates *"
          />
          <p className="text-xs text-gray-500 mb-4">
            Bottle cost is the crate price plus supply costs such as transportation, divided by the bottles. Saving updates the average on store inventory.
          </p>
        </>
      )}

      {catalogReceive && (
        <p className="text-sm text-red-600 mb-4">
          This drink is linked to a storeroom item. Delete this transaction and record a new receipt.
        </p>
      )}

      {catalogReceive && (
        <div className="mb-1 flex w-full flex-nowrap flex-row items-start gap-3">
          <Field id="unitCost" label="Unit cost" widthClass={alignedField} labelClassName={alignedLabel}>
            <input id="unitCost" readOnly value={catalogTotal === undefined ? '' : formatPropertyMoney(transactionData.unitCost, currency)} className="bg-gray-100" />
          </Field>
        </div>
      )}

      {(watchedTxnType === 'issue') && (
        <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
          <div className="flex-1">
            <label htmlFor="barId" className="block mb-2">Bar *</label>
            <select
              id="barId"
              {...register('barId')}
              className="w-full border rounded p-2"
            >
              <option value="">Select a bar</option>
              {barOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.barId && <span className="text-red-500 text-sm">{errors.barId.message}</span>}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        The original calendar day is kept so this edit stays on the same stock log.
      </p>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter transaction notes (optional)"
          />
          {errors.notes && <span className="text-red-500 text-sm">{errors.notes.message}</span>}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit" disabled={catalogReceive}>
          Update Transaction
        </Button>
      </div>
    </form>
  );
}
