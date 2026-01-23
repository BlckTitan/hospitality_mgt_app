'use client';

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
  inventoryItemId: string;
  transactionType: 'purchase' | 'usage' | 'adjustment' | 'waste' | 'transfer';
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  performedBy?: string;
  transactionDate: number;
};

interface EditInventoryTransactionFormProps {
  transactionData: any;
  transactionId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditInventoryTransactionForm({ transactionData, transactionId, onSuccess, onClose }: EditInventoryTransactionFormProps) {
  const updateTransaction = useMutation(api.inventoryTransactions.updateInventoryTransaction);

  const inventoryItemsResponse = useQuery(api.inventoryItems.getAllInventoryItems, {
    propertyId: transactionData.inventoryItem?.propertyId as Id<'properties'>,
  });
  const inventoryItems = inventoryItemsResponse?.data || [];

  // Get all staffs for dropdown
  const staffsResponse = useQuery(api.staff.getAllStaffs);
  const staffs = Array.isArray(staffsResponse) ? staffsResponse : [];

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      inventoryItemId: transactionData.inventoryItemId || '',
      transactionType: transactionData.transactionType || 'purchase',
      quantity: transactionData.quantity ?? 0,
      unitCost: transactionData.unitCost,
      referenceType: transactionData.referenceType || '',
      referenceId: transactionData.referenceId || '',
      reason: transactionData.reason || '',
      performedBy: transactionData.performedBy || '',
      transactionDate: transactionData.transactionDate || Date.now(),
    },
  });

  const transactionType = watch('transactionType');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateTransaction({
        transactionId: transactionId as Id<'inventoryTransactions'>,
        transactionType: data.transactionType,
        quantity: data.quantity,
        unitCost: data.unitCost,
        referenceType: data.referenceType || undefined,
        referenceId: data.referenceId || undefined,
        reason: data.reason || undefined,
        performedBy: data.performedBy ? (data.performedBy as Id<'staffs'>) : undefined,
        transactionDate: data.transactionDate,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Inventory transaction updated successfully!');
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/inventory-management/inventory-transaction';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update transaction failed:', error);
      toast.error('Failed to update transaction. Please try again.');
    }
  };

  const transactionTypeOptions = [
    { value: 'purchase', label: 'Purchase (Add to inventory)' },
    { value: 'usage', label: 'Usage (Remove from inventory)' },
    { value: 'adjustment', label: 'Adjustment (Can be positive or negative)' },
    { value: 'waste', label: 'Waste (Remove from inventory)' },
    { value: 'transfer', label: 'Transfer (Move between locations)' },
  ];

  const inventoryItemOptions = inventoryItems
    .filter((item: any) => item.isActive)
    .map((item: any) => ({
      value: item._id,
      label: `${item.name} (${item.sku}) - Current: ${item.currentQuantity} ${item.unit}`,
    }));

  const staffOptions = staffs
    .filter((staff: any) => staff.employmentStatus === 'employed')
    .map((staff: any) => ({
      value: staff._id,
      label: `${staff.firstName} ${staff.lastName}`,
    }));

  const quantityLabel = transactionType === 'purchase' 
    ? 'Quantity (positive) *' 
    : transactionType === 'usage' || transactionType === 'waste'
    ? 'Quantity (will be removed) *'
    : 'Quantity (positive or negative) *';

  // Format date for datetime-local input
  const formatDateForInput = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editInventoryTransactionForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="inventoryItemId" className="block mb-2">Inventory Item *</label>
          <select
            id="inventoryItemId"
            {...register('inventoryItemId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue={transactionData.inventoryItemId}
          >
            <option disabled value="">Select an inventory item</option>
            {inventoryItemOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.inventoryItemId && <span className="text-red-500 text-sm">{errors.inventoryItemId.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="transactionType" className="block mb-2">Transaction Type *</label>
          <select
            id="transactionType"
            {...register('transactionType', { required: true })}
            className="w-full border rounded p-2"
            defaultValue={transactionData.transactionType}
          >
            {transactionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.transactionType && <span className="text-red-500 text-sm">{errors.transactionType.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="quantity"
            label={quantityLabel}
            type="number"
            inputWidth="w-full"
            // step="0.01"
            register={register('quantity', { required: true, valueAsNumber: true, min: 0.01 })}
            error={errors.quantity}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="unitCost"
            label="Unit Cost"
            type="number"
            inputWidth="w-full"
            // step="0.01"
            register={register('unitCost', { valueAsNumber: true, min: 0 })}
            error={errors.unitCost}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="transactionDate" className="block mb-2">Transaction Date *</label>
          <input
            id="transactionDate"
            type="datetime-local"
            {...register('transactionDate', { 
              required: true,
              setValueAs: (value) => {
                if (typeof value === 'string') {
                  return new Date(value).getTime();
                }
                return value;
              }
            })}
            className="w-full border rounded p-2"
            defaultValue={formatDateForInput(transactionData.transactionDate)}
          />
          {errors.transactionDate && <span className="text-red-500 text-sm">{errors.transactionDate.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="performedBy" className="block mb-2">Performed By</label>
          <select
            id="performedBy"
            {...register('performedBy')}
            className="w-full border rounded p-2"
            defaultValue={transactionData.performedBy || ''}
          >
            <option value="">None</option>
            {staffOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.performedBy && <span className="text-red-500 text-sm">{errors.performedBy.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="referenceType"
            label="Reference Type"
            type="text"
            inputWidth="w-full"
            register={register('referenceType')}
            error={errors.referenceType}
            placeholder="e.g., PurchaseOrder, OrderLine"
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="referenceId"
            label="Reference ID"
            type="text"
            inputWidth="w-full"
            register={register('referenceId')}
            error={errors.referenceId}
            placeholder="ID of referenced entity"
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="reason">Reason/Notes</label>
          <textarea
            id="reason"
            {...register('reason')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter reason or notes for this transaction (optional)"
            defaultValue={transactionData.reason || ''}
          />
          {errors.reason && <span className="text-red-500 text-sm">{errors.reason.message}</span>}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Update Transaction
        </Button>
      </div>
    </form>
  );
}
