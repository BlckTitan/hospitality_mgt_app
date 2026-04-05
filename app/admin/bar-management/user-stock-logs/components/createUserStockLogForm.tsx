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
  userId: string;
  barId: string;
  beverageId: string;
  logDate: string;
  openingStock: number;
  closingStock: number;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createUserStockLog = useMutation(api.userStockLogs.createUserStockLog);
  
  // Fetch users for this property
  const usersResponse = useQuery(api.users.getAllUsers, { propertyId: propertyId as Id<'properties'> });
  const users = usersResponse?.data || [];
  
  // Fetch bars for this property
  const barsResponse = useQuery(api.bars.getAllBars, { propertyId: propertyId as Id<'properties'> });
  const bars = barsResponse?.data || [];
  
  // Fetch beverages for this property
  const beveragesResponse = useQuery(api.beverages.getAllBeverages, { propertyId: propertyId as Id<'properties'> });
  const beverages = beveragesResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      userId: '',
      barId: '',
      beverageId: '',
      logDate: new Date().toISOString().split('T')[0], // Today's date
      openingStock: 0,
      closingStock: 0,
    },
  });

  const watchedValues = watch();
  
  // Note: newStockReceived is automatically managed by storeTransactions
  // Sales quantity will be calculated when closing stock is provided

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createUserStockLog({
        propertyId: propertyId as Id<'properties'>,
        userId: data.userId as Id<'users'>,
        barId: data.barId as Id<'bars'>,
        beverageId: data.beverageId as Id<'beverages'>,
        logDate: data.logDate,
        openingStock: data.openingStock,
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

  const userOptions = users
    .filter((user: any) => user.isActive)
    .map((user: any) => ({
      value: user._id,
      label: user.name,
    }));

  const barOptions = bars
    .filter((bar: any) => bar.isActive)
    .map((bar: any) => ({
      value: bar._id,
      label: `${bar.name} (${bar.location})`,
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
          <label htmlFor="userId" className="block mb-2">User *</label>
          <select
            id="userId"
            {...register('userId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a user</option>
            {userOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.userId && <span className="text-red-500 text-sm">{errors.userId.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="barId" className="block mb-2">Bar *</label>
          <select
            id="barId"
            {...register('barId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a bar</option>
            {barOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.barId && <span className="text-red-500 text-sm">{errors.barId.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="logDate" className="block mb-2">Date *</label>
          <input
            id="logDate"
            type="date"
            {...register('logDate', { required: true })}
            className="w-full border rounded p-2"
            defaultValue={new Date().toISOString().split('T')[0]}
          />
          {errors.logDate && <span className="text-red-500 text-sm">{errors.logDate.message}</span>}
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
            <p className="text-sm font-semibold mb-2">Note:</p>
            <p className="text-sm">• New stock received will be updated automatically when stock is issued from store</p>
            <p className="text-sm">• Total stock and sales quantity will be calculated automatically</p>
            <p className="text-sm">• Opening stock will be populated from previous day's closing stock if available</p>
          </div>
        </div>
        <div className="flex-1">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm font-semibold mb-2">Day-Scoped Tracking:</p>
            <p className="text-sm">• Each user/bar/beverage combination has one record per day</p>
            <p className="text-sm">• Stock issues are automatically applied to the correct day's record</p>
            <p className="text-sm">• Records cannot be modified once finalized</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Create Stock Log
        </Button>
      </div>
    </form>
  );
}
