'use client'

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import InputComponent from "../../../../../shared/input";

type FormData = {
  shiftId: string;
  beverageId: string;
  openingStock: number;
  newStockReceived: number;
  closingStock: number;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createUserStockLog = useMutation(api.userStockLogs.createUserStockLog);
  
  // Fetch shifts for this property
  const shiftsResponse = useQuery(api.shifts.getAllShifts, { propertyId: propertyId as Id<'properties'> });
  const shifts = shiftsResponse?.data || [];
  
  // Fetch beverages for this property
  const beveragesResponse = useQuery(api.beverages.getAllBeverages, { propertyId: propertyId as Id<'properties'> });
  const beverages = beveragesResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      shiftId: '',
      beverageId: '',
      openingStock: 0,
      newStockReceived: 0,
      closingStock: 0,
    },
  });

  const watchedValues = watch();
  
  // Calculate total stock and sales quantity for display
  const totalStock = (watchedValues.openingStock || 0) + (watchedValues.newStockReceived || 0);
  const salesQuantity = totalStock - (watchedValues.closingStock || 0);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createUserStockLog({
        propertyId: propertyId as Id<'properties'>,
        shiftId: data.shiftId as Id<'shifts'>,
        beverageId: data.beverageId as Id<'beverages'>,
        openingStock: data.openingStock,
        newStockReceived: data.newStockReceived,
        closingStock: data.closingStock,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('User stock log created successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/bar-management/user-stock-logs';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Add new user stock log failed:', error);
      toast.error('Failed to add new user stock log. Please try again.');
    }
  };

  const shiftOptions = shifts
    .filter((shift: any) => !shift.isFinalized)
    .map((shift: any) => ({
      value: shift._id,
      label: `${shift.user?.name || 'Unknown User'} - ${shift.bar?.name || 'Unknown Bar'} - ${shift.shiftDate} (${shift.startTime})`,
    }));

  const beverageOptions = beverages
    .filter((beverage: any) => beverage.isActive)
    .map((beverage: any) => ({
      value: beverage._id,
      label: `${beverage.name} - $${beverage.unitPrice}/${beverage.unitOfMeasure}`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createUserStockLogForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="shiftId" className="block mb-2">Shift *</label>
          <select
            id="shiftId"
            {...register('shiftId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a shift</option>
            {shiftOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.shiftId && <span className="text-red-500 text-sm">{errors.shiftId.message}</span>}
        </div>
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
            id="newStockReceived"
            label="New Stock Received *"
            type="number"
            inputWidth="w-full"
            register={register('newStockReceived', { valueAsNumber: true, min: 0 })}
            error={errors.newStockReceived}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
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
        <div className="flex-1">
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm font-semibold mb-2">Calculated Values:</p>
            <p className="text-sm">Total Stock: <span className="font-bold">{totalStock}</span></p>
            <p className="text-sm">Sales Quantity: <span className="font-bold">{salesQuantity}</span></p>
            {salesQuantity < 0 && <p className="text-red-500 text-sm">Warning: Closing stock exceeds total stock!</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit" disabled={salesQuantity < 0}>
          Create Stock Log
        </Button>
      </div>
    </form>
  );
}
