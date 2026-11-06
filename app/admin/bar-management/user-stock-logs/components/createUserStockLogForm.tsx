'use client'

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from '../../../../../shared/button';
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { formatPropertyMoney, usePropertyCurrency } from "../../../inventory-management/components/money";

type FormData = {
  barId: string;
  beverageId: string;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createUserStockLog = useMutation(api.userStockLogs.createUserStockLog);
  const currency = usePropertyCurrency(propertyId);
  const { isAuthenticated } = useConvexAuth();
  const propertyArgs = isAuthenticated && propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip';
  const barsResponse = useQuery(api.bars.getAllBars, propertyArgs);
  const bars = barsResponse?.data || [];
  const beveragesResponse = useQuery(api.beverages.getAllBeverages, propertyArgs);
  const beverages = beveragesResponse?.data || [];

  const [salesUserId, setSalesUserId] = useState('')
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      barId: '',
      beverageId: '',
    },
  });

  const watchedBarId = watch('barId')
  const salesRoster = useQuery(
    api.barSales.listOnShiftSellers,
    isAuthenticated && propertyId && watchedBarId
      ? {
          propertyId: propertyId as Id<'properties'>,
          barId: watchedBarId as Id<'bars'>,
          includeEnded: true,
        }
      : 'skip',
  )

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (salesRoster?.mustChoose && !salesUserId) {
      toast.error('Choose the waiter this sale belongs to.')
      return
    }
    try {
      const response = await createUserStockLog({
        propertyId: propertyId as Id<'properties'>,
        barId: data.barId as Id<'bars'>,
        beverageId: data.beverageId as Id<'beverages'>,
        ...(salesRoster?.mustChoose && salesUserId
          ? { salesUserId: salesUserId as Id<'users'> }
          : {}),
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success(response.message);
        reset();
        onSuccess();
      }
    } catch (error: any) {
      console.error('Add new user stock log failed:', error);
      toast.error(error?.message || 'Failed to add new user stock log. Please try again.');
    }
  };

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
      label: `${beverage.name} - ${formatPropertyMoney(beverage.unitPrice, currency)}/${beverage.unitOfMeasure}`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createUserStockLogForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="barId" className="block mb-2">Bar *</label>
          <select id="barId" {...register('barId', { required: true })} className="w-full border rounded p-2" defaultValue="">
            <option disabled value="">Select a bar</option>
            {barOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {salesRoster?.mode === 'admin' && salesRoster.mustChoose && (
            <div className="mt-3">
              <label htmlFor="salesUserId" className="block mb-2">Waiter *</label>
              <select
                id="salesUserId"
                className="w-full border rounded p-2"
                value={salesUserId}
                onChange={(event) => setSalesUserId(event.target.value)}
              >
                <option value="">Choose the waiter</option>
                {salesRoster.sellers.map((seller) => (
                  <option key={seller.userId} value={seller.userId}>{seller.name}</option>
                ))}
              </select>
            </div>
          )}
          {salesRoster?.mode === 'admin' && salesRoster.sellers.length === 1 && (
            <p className="mt-2 text-sm text-gray-600">Sales for {salesRoster.sellers[0].name}</p>
          )}
          {salesRoster?.message && (
            <p className="mt-2 text-sm text-amber-800">{salesRoster.message}</p>
          )}
          {errors.barId && <span className="text-red-500 text-sm">{errors.barId.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="beverageId" className="block mb-2">Beverage *</label>
          <select id="beverageId" {...register('beverageId', { required: true })} className="w-full border rounded p-2" defaultValue="">
            <option disabled value="">Select a beverage</option>
            {beverageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.beverageId && <span className="text-red-500 text-sm">{errors.beverageId.message}</span>}
        </div>
      </div>

      <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
        <p>The log is created for today in the property timezone.</p>
        <p>The same drink is added to My stock today for every active waiter and bartender at this property.</p>
        <p>Opening stock is each person&apos;s last finalized close for this bar and drink. Closing starts equal to opening until they count it.</p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Create Stock Log</Button>
      </div>
    </form>
  );
}
