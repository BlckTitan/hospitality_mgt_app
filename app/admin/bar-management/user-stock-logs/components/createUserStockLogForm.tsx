'use client'

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

type FormData = {
  userId: string;
  barId: string;
  beverageId: string;
  shiftId?: string;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createUserStockLog = useMutation(api.userStockLogs.createUserStockLog);
  const usersResponse = useQuery(api.users.getAllUsers, { propertyId: propertyId as Id<'properties'> });
  const users = usersResponse?.data || [];
  const barsResponse = useQuery(api.bars.getAllBars, { propertyId: propertyId as Id<'properties'> });
  const bars = barsResponse?.data || [];
  const beveragesResponse = useQuery(api.beverages.getAllBeverages, { propertyId: propertyId as Id<'properties'> });
  const beverages = beveragesResponse?.data || [];
  const shiftsResponse = useQuery(api.shifts.getAllShifts, { propertyId: propertyId as Id<'properties'> });
  const shifts = shiftsResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      userId: '',
      barId: '',
      beverageId: '',
      shiftId: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createUserStockLog({
        propertyId: propertyId as Id<'properties'>,
        userId: data.userId as Id<'users'>,
        barId: data.barId as Id<'bars'>,
        shiftId: data.shiftId ? data.shiftId as Id<'shifts'> : undefined,
        beverageId: data.beverageId as Id<'beverages'>,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('User stock log created for today. Opening stock was taken from the last finalized close.');
        reset();
        onSuccess();
      }
    } catch (error: any) {
      console.error('Add new user stock log failed:', error);
      toast.error(error?.message || 'Failed to add new user stock log. Please try again.');
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
      label: `${beverage.name} - ${beverage.unitPrice}/${beverage.unitOfMeasure}`,
    }));

  const shiftOptions = shifts
    .filter((shift: any) => !shift.isFinalized && shift.barId)
    .map((shift: any) => ({
      value: shift._id,
      label: `${shift.staffName || shift.user?.name || 'Unknown'} - ${shift.bar?.name || 'Unknown'} (${shift.shiftDate})`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createUserStockLogForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="userId" className="block mb-2">User *</label>
          <select id="userId" {...register('userId', { required: true })} className="w-full border rounded p-2" defaultValue="">
            <option disabled value="">Select a user</option>
            {userOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.userId && <span className="text-red-500 text-sm">{errors.userId.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="barId" className="block mb-2">Bar *</label>
          <select id="barId" {...register('barId', { required: true })} className="w-full border rounded p-2" defaultValue="">
            <option disabled value="">Select a bar</option>
            {barOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.barId && <span className="text-red-500 text-sm">{errors.barId.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
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
        <div className="flex-1">
          <label htmlFor="shiftId" className="block mb-2">Shift (optional)</label>
          <select id="shiftId" {...register('shiftId')} className="w-full border rounded p-2" defaultValue="">
            <option value="">Use today&apos;s F&B shift</option>
            {shiftOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
        <p>The log is created for today in the property timezone.</p>
        <p>Opening stock is taken from the last finalized closing stock for this user, bar, and beverage.</p>
        <p>Closing stock starts equal to opening stock until the waiter counts it.</p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Create Stock Log</Button>
      </div>
    </form>
  );
}
