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
  userId: string;
  barId: string;
  shiftDate: string;
  startTime: string;
  endTime?: string;
  isFinalized: boolean;
};

interface EditShiftFormProps {
  shiftData: any;
  shiftId: string;
  onSuccess: () => void;
  onClose: () => void;
  propertyId: string;
}

export default function EditShiftForm({ shiftData, shiftId, onSuccess, onClose, propertyId }: EditShiftFormProps) {
  const updateShift = useMutation(api.shifts.updateShift);
  const usersResponse = useQuery(api.shifts.getActiveUsers, { propertyId: propertyId as Id<'properties'> });
  const barsResponse = useQuery(api.shifts.getActiveBars, { propertyId: propertyId as Id<'properties'> });
  const users = usersResponse?.data || [];
  const bars = barsResponse?.data || [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      userId: shiftData.userId || '',
      barId: shiftData.barId || '',
      shiftDate: shiftData.shiftDate || '',
      startTime: shiftData.startTime || '',
      endTime: shiftData.endTime || '',
      isFinalized: shiftData.isFinalized ?? false,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateShift({
        shiftId: shiftId as Id<'shifts'>,
        userId: data.userId as Id<'users'>,
        barId: data.barId as Id<'bars'>,
        shiftDate: data.shiftDate,
        startTime: data.startTime,
        endTime: data.endTime,
        isFinalized: data.isFinalized,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Shift updated successfully!');
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/shift-management/shift';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update shift failed:', error);
      toast.error('Failed to update shift. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editShiftForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <label className="w-full">
          <span className="block text-sm font-medium text-gray-700 mb-1">User *</span>
          <select
            id="userId"
            {...register('userId', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          {errors.userId && (
            <p className="text-red-500 text-sm mt-1">{errors.userId.message}</p>
          )}
        </label>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <label className="w-full">
          <span className="block text-sm font-medium text-gray-700 mb-1">Bar *</span>
          <select
            id="barId"
            {...register('barId', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a bar</option>
            {bars.map((bar) => (
              <option key={bar._id} value={bar._id}>
                {bar.name} - {bar.location}
              </option>
            ))}
          </select>
          {errors.barId && (
            <p className="text-red-500 text-sm mt-1">{errors.barId.message}</p>
          )}
        </label>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="shiftDate" label="Shift Date *" type="date" inputWidth="w-full" register={register('shiftDate', { required: true })} error={errors.shiftDate} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="startTime" label="Start Time *" type="time" inputWidth="w-full" register={register('startTime', { required: true })} error={errors.startTime} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="endTime" label="End Time" type="time" inputWidth="w-full" register={register('endTime')} error={errors.endTime} />
      </div>

      <div className="w-full h-fit flex flex-col lg:items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isFinalized')} defaultChecked={shiftData.isFinalized ?? false} className="mr-2 w-4 h-3" />
          <span>Finalized</span>
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Update Shift</Button>
      </div>
    </form>
  );
}
