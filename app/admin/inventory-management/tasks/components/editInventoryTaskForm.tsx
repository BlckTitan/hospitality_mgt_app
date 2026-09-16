'use client';

import { useMutation, useQuery } from "convex/react";
import { Button } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { editFormSchema } from "./validation";
import { SubmitHandler, useForm } from "react-hook-form";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

type FormData = {
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  leadId?: string;
  helperIds?: string[];
  notes?: string;
};

export function FormComponent({
  id,
  status,
  leadId,
  helperIds,
  notes,
  propertyId,
}: {
  id: Id<'inventoryTasks'>;
  status: string;
  leadId?: string;
  helperIds?: string[];
  notes?: string;
  propertyId: string;
}) {
  const updateTask = useMutation(api.inventoryTasks.updateInventoryTask);
  const staffList = useQuery(api.housekeepingTasks.listAssignableStaff, { propertyId: propertyId as Id<'properties'> });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(editFormSchema) as any,
    defaultValues: {
      status: status as FormData['status'],
      leadId: leadId || '',
      helperIds: helperIds ?? [],
      notes: notes || '',
    },
  });

  const selectedLead = watch('leadId');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateTask({
        inventoryTaskId: id,
        status: data.status,
        leadId: data.leadId ? (data.leadId as Id<'staffs'>) : undefined,
        helperIds: (data.helperIds ?? [])
          .filter((helperId) => helperId && helperId !== data.leadId)
          .map((helperId) => helperId as Id<'staffs'>),
        notes: data.notes || undefined,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/inventory-management/tasks";
        }, 1500);
      }
    } catch (error) {
      console.error("Edit inventory task failed:", error);
      toast.error("Failed to update inventory task. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='mt-4'>
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="status" className="block mb-2">Status *</label>
          <select id="status" {...register('status')} className="w-full border rounded p-2">
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="leadId" className="block mb-2">Lead</label>
          <select id="leadId" {...register('leadId')} className="w-full border rounded p-2">
            <option value="">Unassigned</option>
            {(staffList ?? []).map((row) => (
              <option key={row._id} value={row._id}>{row.firstName} {row.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full mb-2 lg:mb-4">
        <label className="block mb-2">Helpers (optional)</label>
        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto border rounded p-2">
          {(staffList ?? []).filter((row) => row._id !== selectedLead).map((row) => (
            <label key={row._id} className="flex items-center gap-2">
              <input type="checkbox" value={row._id} {...register('helperIds')} />
              {row.firstName} {row.lastName}
            </label>
          ))}
        </div>
      </div>

      <div className="w-full mb-2 lg:mb-4">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="w-full border rounded p-2"
          placeholder="Required when cancelling"
        />
        {errors.notes && <span className="text-red-500 text-sm">{errors.notes.message}</span>}
      </div>

      <Button type="submit" variant='dark'>Submit</Button>
    </form>
  );
}
