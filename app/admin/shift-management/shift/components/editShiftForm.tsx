'use client';

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { DEPARTMENT_LABELS, formSchema, SHIFT_DEPARTMENTS } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  employeeId: string;
  department: (typeof SHIFT_DEPARTMENTS)[number];
  barId?: string;
  shiftDate: string;
  startTime: string;
  endTime?: string;
};

interface EditShiftFormProps {
  shiftData: any;
  shiftId: string;
  onSuccess: () => void;
  onClose: () => void;
  propertyId: string;
}

function asDepartment(value?: string): (typeof SHIFT_DEPARTMENTS)[number] {
  if (value && SHIFT_DEPARTMENTS.includes(value as (typeof SHIFT_DEPARTMENTS)[number])) {
    return value as (typeof SHIFT_DEPARTMENTS)[number];
  }
  return "other";
}

export default function EditShiftForm({ shiftData, shiftId, onSuccess, onClose, propertyId }: EditShiftFormProps) {
  const updateShift = useMutation(api.shifts.updateShift);
  const staffResponse = useQuery(api.shifts.listStaffForShifts, { propertyId: propertyId as Id<'properties'> });
  const barsResponse = useQuery(api.shifts.getActiveBars, { propertyId: propertyId as Id<'properties'> });
  const staff = staffResponse?.data || [];
  const bars = barsResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      employeeId: shiftData.employeeId || shiftData.staff?._id || '',
      department: asDepartment(shiftData.department),
      barId: shiftData.barId || '',
      shiftDate: shiftData.shiftDate || '',
      startTime: shiftData.startTime || '',
      endTime: shiftData.endTime || '',
    },
  });

  const department = watch('department');

  useEffect(() => {
    if (shiftData.isFinalized) {
      toast.error('Finalized shifts cannot be edited');
    }
  }, [shiftData.isFinalized]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateShift({
        shiftId: shiftId as Id<'shifts'>,
        employeeId: data.employeeId as Id<'staffs'>,
        department: data.department,
        barId: data.department === 'fnb' && data.barId ? data.barId as Id<'bars'> : undefined,
        shiftDate: data.shiftDate,
        startTime: data.startTime,
        endTime: data.endTime || undefined,
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

  if (shiftData.isFinalized) {
    return (
      <div>
        <p className="text-sm text-gray-700 mb-4">This shift is finalized and cannot be edited. Draft Hours were created for approval when it was finalized.</p>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editShiftForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <label className="w-full">
          <span className="block text-sm font-medium text-gray-700 mb-1">Staff *</span>
          <select
            id="employeeId"
            {...register('employeeId', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select staff</option>
            {staff.map((row) => (
              <option key={row._id} value={row._id}>
                {row.firstName} {row.lastName}
              </option>
            ))}
          </select>
          {errors.employeeId && (
            <p className="text-red-500 text-sm mt-1">{errors.employeeId.message}</p>
          )}
        </label>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <label className="w-full">
          <span className="block text-sm font-medium text-gray-700 mb-1">Department *</span>
          <select
            id="department"
            {...register('department', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SHIFT_DEPARTMENTS.map((item) => (
              <option key={item} value={item}>{DEPARTMENT_LABELS[item]}</option>
            ))}
          </select>
          {errors.department && (
            <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>
          )}
        </label>
      </div>

      {department === 'fnb' && (
        <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
          <label className="w-full">
            <span className="block text-sm font-medium text-gray-700 mb-1">Bar *</span>
            <select
              id="barId"
              {...register('barId')}
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
      )}

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="shiftDate" label="Shift Date *" type="date" inputWidth="w-full" register={register('shiftDate', { required: true })} error={errors.shiftDate} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="startTime" label="Start Time *" type="time" inputWidth="w-full" register={register('startTime', { required: true })} error={errors.startTime} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="endTime" label="End Time" type="time" inputWidth="w-full" register={register('endTime')} error={errors.endTime} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Update Shift</Button>
      </div>
    </form>
  );
}
