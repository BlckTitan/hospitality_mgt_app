'use client';

import { useMutation, useQuery } from "convex/react";
import { Button } from "react-bootstrap";
import { api } from "../../../../convex/_generated/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { SubmitHandler, useForm } from "react-hook-form";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";

type FormData = {
  title: string;
  orderType: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  leadId?: string;
  helperIds?: string[];
  supplierId?: string;
  notes?: string;
};

export function FormComponent({
  id,
  title,
  orderType,
  status,
  priority,
  leadId,
  helperIds,
  supplierId,
  notes,
  propertyId,
}: {
  id: Id<'maintenanceOrders'>;
  title: string;
  orderType: string;
  status: string;
  priority: string;
  leadId?: string;
  helperIds?: string[];
  supplierId?: string;
  notes?: string;
  propertyId: string;
}) {
  const updateOrder = useMutation(api.maintenanceOrders.updateMaintenanceOrder);
  const staffList = useQuery(api.housekeepingTasks.listAssignableStaff, { propertyId: propertyId as Id<'properties'> });
  const suppliers = useQuery(api.suppliers.getAllSuppliers, {
    propertyId: propertyId as Id<'properties'>,
    activeOnly: true,
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      title,
      orderType: orderType as FormData['orderType'],
      status: status as FormData['status'],
      priority: priority as FormData['priority'],
      leadId: leadId || '',
      helperIds: helperIds ?? [],
      supplierId: supplierId || '',
      notes: notes || '',
    },
  });

  const selectedLead = watch('leadId');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateOrder({
        maintenanceOrderId: id,
        title: data.title,
        orderType: data.orderType,
        status: data.status,
        priority: data.priority,
        supplierId: data.supplierId ? (data.supplierId as Id<'suppliers'>) : undefined,
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
          window.location.href = "/admin/maintenance";
        }, 1500);
      }
    } catch (error) {
      console.error("Edit maintenance order failed:", error);
      toast.error("Failed to update maintenance order. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='mt-4'>
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="title"
            label="Title *"
            type="text"
            inputWidth="w-full"
            register={register('title')}
            error={errors.title}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="orderType" className="block mb-2">Order type *</label>
          <select id="orderType" {...register('orderType')} className="w-full border rounded p-2">
            <option value="preventive">Preventive</option>
            <option value="corrective">Corrective</option>
            <option value="emergency">Emergency</option>
            <option value="inspection">Inspection</option>
          </select>
        </div>
      </div>

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
          <label htmlFor="priority" className="block mb-2">Priority *</label>
          <select id="priority" {...register('priority')} className="w-full border rounded p-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="leadId" className="block mb-2">Lead</label>
          <select id="leadId" {...register('leadId')} className="w-full border rounded p-2">
            <option value="">Unassigned</option>
            {(staffList ?? []).map((row) => (
              <option key={row._id} value={row._id}>{row.firstName} {row.lastName}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="supplierId" className="block mb-2">Vendor (optional)</label>
          <select id="supplierId" {...register('supplierId')} className="w-full border rounded p-2">
            <option value="">None</option>
            {(suppliers?.data ?? []).map((supplier: { _id: string; name: string }) => (
              <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
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
