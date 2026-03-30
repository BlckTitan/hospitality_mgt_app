'use client'

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { editFormSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  beverageId: string;
  barId?: string;
  userId?: string;
  txnType: 'receive' | 'issue';
  qty: number;
  txnDate: Date;
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
  const beveragesResponse = useQuery(api.beverages.getAllBeverages, { propertyId: transactionData.propertyId as Id<'properties'> });
  const barsResponse = useQuery(api.bars.getAllBars, { propertyId: transactionData.propertyId as Id<'properties'> });
  const usersResponse = useQuery(api.users.getAllUsers, { propertyId: transactionData.propertyId as Id<'properties'> });

  const beverages = beveragesResponse?.data || [];
  const bars = barsResponse?.data || [];
  const users = usersResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(editFormSchema) as any,
    defaultValues: {
      beverageId: transactionData.beverageId || '',
      barId: transactionData.barId || '',
      userId: transactionData.userId || '',
      txnType: transactionData.txnType || 'receive',
      qty: transactionData.qty || 1,
      txnDate: new Date(transactionData.txnDate || Date.now()),
      notes: transactionData.notes || '',
    },
  });

  const watchedTxnType = watch('txnType');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateTransaction({
        transactionId: transactionId as Id<'storeTransactions'>,
        beverageId: data.beverageId as Id<'beverages'>,
        barId: data.barId ? data.barId as Id<'bars'> : undefined,
        userId: data.userId ? data.userId as Id<'users'> : undefined,
        txnType: data.txnType,
        qty: data.qty,
        txnDate: data.txnDate.getTime(),
        notes: data.notes,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Store transaction updated successfully!');
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/bar-management/store-transactions';
        }, 1500);
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

  const userOptions = users
    .filter((u: any) => u.isActive)
    .map((u: any) => ({
      value: u._id,
      label: `${u.name} (${u.email})`,
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

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="txnType" className="block mb-2">Transaction Type *</label>
          <select
            id="txnType"
            {...register('txnType', { required: true })}
            className="w-full border rounded p-2"
          >
            <option value="receive">Receive (Stock In)</option>
            <option value="issue">Issue (Stock Out)</option>
          </select>
          {errors.txnType && <span className="text-red-500 text-sm">{errors.txnType.message}</span>}
        </div>
        <div className="flex-1">
          <InputComponent
            id="qty"
            label="Quantity *"
            type="number"
            inputWidth="w-full"
            register={register('qty', { valueAsNumber: true, min: 1 })}
            error={errors.qty}
          />
        </div>
      </div>

      {(watchedTxnType === 'issue') && (
        <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
          <div className="flex-1">
            <label htmlFor="barId" className="block mb-2">Bar (Optional)</label>
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
          <div className="flex-1">
            <label htmlFor="userId" className="block mb-2">User (Optional)</label>
            <select
              id="userId"
              {...register('userId')}
              className="w-full border rounded p-2"
            >
              <option value="">Select a user</option>
              {userOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.userId && <span className="text-red-500 text-sm">{errors.userId.message}</span>}
          </div>
        </div>
      )}

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="txnDate" className="block mb-2">Transaction Date *</label>
          <input
            id="txnDate"
            type="datetime-local"
            {...register('txnDate', { 
              required: true,
              valueAsDate: true 
            })}
            className="w-full border rounded p-2"
          />
          {errors.txnDate && <span className="text-red-500 text-sm">{errors.txnDate.message}</span>}
        </div>
      </div>

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
