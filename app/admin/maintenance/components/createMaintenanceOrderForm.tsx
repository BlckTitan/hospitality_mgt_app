'use client';

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import { Button, Modal } from "react-bootstrap";
import { Id } from "../../../../convex/_generated/dataModel";

type FormData = {
  title: string;
  orderType: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  leadId?: string;
  helperIds?: string[];
  supplierId?: string;
};

export function FormComponent({ onClose, propertyId }: { onClose?: () => void; propertyId: string }) {
  const createOrder = useMutation(api.maintenanceOrders.createMaintenanceOrder);
  const staffList = useQuery(api.housekeepingTasks.listAssignableStaff, { propertyId: propertyId as Id<'properties'> });
  const suppliers = useQuery(api.suppliers.getAllSuppliers, {
    propertyId: propertyId as Id<'properties'>,
    activeOnly: true,
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      title: '',
      orderType: 'corrective',
      priority: 'medium',
      leadId: '',
      helperIds: [],
      supplierId: '',
    },
  });

  const selectedLead = watch('leadId');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createOrder({
        propertyId: propertyId as Id<'properties'>,
        title: data.title,
        orderType: data.orderType,
        priority: data.priority,
        supplierId: data.supplierId ? (data.supplierId as Id<'suppliers'>) : undefined,
        leadId: data.leadId ? (data.leadId as Id<'staffs'>) : undefined,
        helperIds: (data.helperIds ?? [])
          .filter((id) => id && id !== data.leadId)
          .map((id) => id as Id<'staffs'>),
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success(response.message);
        if (onClose) onClose();
        setTimeout(() => {
          window.location.href = "/admin/maintenance";
        }, 1500);
      }
    } catch (error) {
      console.error("Add new maintenance order failed:", error);
      toast.error("Failed to add new maintenance order. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createMaintenanceOrderForm'>
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
          {errors.orderType && <span className="text-red-500 text-sm">{errors.orderType.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="priority" className="block mb-2">Priority *</label>
          <select id="priority" {...register('priority')} className="w-full border rounded p-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
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

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="leadId" className="block mb-2">Lead</label>
          <select id="leadId" {...register('leadId')} className="w-full border rounded p-2">
            <option value="">Default department supervisor</option>
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

      <Modal.Footer>
        <Button type="submit" variant='dark'>Submit</Button>
      </Modal.Footer>
    </form>
  );
}
