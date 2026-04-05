'use client';

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { editFormSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import InputComponent from "../../../../../shared/input";

type FormData = {
  openingStock: number;
  closingStock: number;
};

interface EditUserStockLogFormProps {
  stockLogData: any;
  stockLogId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditUserStockLogForm({ stockLogData, stockLogId, onSuccess, onClose }: EditUserStockLogFormProps) {
  const updateUserStockLog = useMutation(api.userStockLogs.updateUserStockLog);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: yupResolver(editFormSchema) as any,
    defaultValues: {
      openingStock: stockLogData.openingStock || 0,
      closingStock: stockLogData.closingStock || 0,
    },
  });

  const watchedValues = watch();
  
  // Calculate current totals for display
  const totalStock = (watchedValues.openingStock || 0) + (stockLogData.newStockReceived || 0);
  const salesQuantity = totalStock - (watchedValues.closingStock || 0);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateUserStockLog({
        stockLogId: stockLogId as Id<'userStockLogs'>,
        openingStock: data.openingStock,
        closingStock: data.closingStock,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('User stock log updated successfully!');
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/user-stock-logs';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update user stock log failed:', error);
      toast.error('Failed to update user stock log. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editUserStockLogForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label className="block mb-2">User & Bar</label>
          <input
            type="text"
            value={`${stockLogData.user?.name || 'Unknown User'} - ${stockLogData.bar?.name || 'Unknown Bar'}`}
            disabled
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-2">Date & Beverage</label>
          <input
            type="text"
            value={`${stockLogData.logDate || 'Unknown'} - ${stockLogData.beverage?.name || 'Unknown'}`}
            disabled
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="openingStock"
            label="Opening Stock *"
            type="number"
            inputWidth="w-full"
            register={register('openingStock', { valueAsNumber: true, min: 0 })}
            error={errors.openingStock}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="closingStock"
            label="Closing Stock *"
            type="number"
            inputWidth="w-full"
            register={register('closingStock', { valueAsNumber: true, min: 0 })}
            error={errors.closingStock}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm font-semibold mb-2">Current Values:</p>
            <p className="text-sm">Opening Stock: <span className="font-bold">{watchedValues.openingStock || 0}</span></p>
            <p className="text-sm">New Stock Received: <span className="font-bold">{stockLogData.newStockReceived || 0}</span></p>
            <p className="text-sm">Total Stock: <span className="font-bold">{totalStock}</span></p>
            <p className="text-sm">Sales Quantity: <span className="font-bold">{salesQuantity}</span></p>
            <p className="text-sm">Sales Value: <span className="font-bold">${salesQuantity * (stockLogData.beverage?.unitPrice || 0)}</span></p>
            {salesQuantity < 0 && <p className="text-red-500 text-sm">Warning: Closing stock exceeds total stock!</p>}
          </div>
        </div>
        <div className="flex-1">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm font-semibold mb-2">Status:</p>
            <p className="text-sm">Finalized: <span className={`font-bold ${stockLogData.isFinalized ? 'text-green-600' : 'text-orange-600'}`}>
              {stockLogData.isFinalized ? 'Yes' : 'No'}
            </span></p>
            <p className="text-sm">Last Updated: <span className="font-bold">
              {stockLogData.lastUpdatedAt ? new Date(stockLogData.lastUpdatedAt).toLocaleString() : 'Unknown'}
            </span></p>
            {stockLogData.isFinalized && (
              <p className="text-red-600 text-sm mt-2">This record is finalized and cannot be edited.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded mb-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This stock log can only be edited if it's not finalized. 
          New stock received is automatically managed when stock is issued from the store.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit" disabled={salesQuantity < 0 || stockLogData.isFinalized}>
          Update Stock Log
        </Button>
      </div>
    </form>
  );
}
