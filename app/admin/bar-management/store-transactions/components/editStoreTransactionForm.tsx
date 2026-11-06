'use client'
import { goToList } from '../../../../../shared/goToList';

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

const alignedLabel = "mb-1 flex w-full min-h-12 items-end leading-snug";
const alignedField = "min-w-0 flex-1";

type FormData = {
  beverageId: string;
  barId?: string;
  txnType: 'receive' | 'issue';
  qty: number;
  unitCost?: number;
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

  const currency = usePropertyCurrency(transactionData.propertyId);
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: yupResolver(editFormSchema) as any,
    defaultValues: {
      beverageId: transactionData.beverageId || '',
      barId: transactionData.barId || '',
      txnType: transactionData.txnType || 'receive',
      qty: transactionData.qty || 1,
      unitCost: transactionData.unitCost,
      notes: transactionData.notes || '',
    },
  });

  const watchedTxnType = watch('txnType');
  const qty = watch('qty');
  const unitCost = watch('unitCost');
  const totalCost =
    Number.isFinite(qty) && Number.isFinite(unitCost) ? qty * Number(unitCost) : undefined;

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateTransaction({
        transactionId: transactionId as Id<'storeTransactions'>,
        beverageId: data.beverageId as Id<'beverages'>,
        barId: data.barId ? data.barId as Id<'bars'> : undefined,
        txnType: data.txnType,
        qty: data.qty,
        ...(data.txnType === 'receive' && Number.isFinite(data.unitCost) ? { unitCost: data.unitCost } : {}),
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
        <Field id="qty" label="Quantity *" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="qty"
            type="number"
            min={1}
            step="any"
            {...register('qty', { valueAsNumber: true })}
          />
          {errors.qty && <span className="text-red-500 text-sm">{errors.qty.message}</span>}
        </Field>
        <Field id="txnType" label="Transaction Type *" widthClass={alignedField} labelClassName={alignedLabel}>
          <select id="txnType" {...register('txnType', { required: true })}>
            <option value="receive">Receive (Stock In)</option>
            <option value="issue">Issue (Stock Out)</option>
          </select>
          {errors.txnType && <span className="text-red-500 text-sm">{errors.txnType.message}</span>}
        </Field>
      </div>

      {watchedTxnType === 'receive' && (
        <>
          <div className="mb-1 flex w-full flex-nowrap flex-row items-start gap-3">
            <Field id="unitCost" label="Unit cost *" widthClass={alignedField} labelClassName={alignedLabel}>
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
            For each item purchased, total cost is the quantity times the unit cost. That purchase updates the average unit cost on Store inventory.
          </p>
        </>
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
        <Button variant="dark" type="submit">
          Update Transaction
        </Button>
      </div>
    </form>
  );
}
