'use client';

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import { Button, Modal } from "react-bootstrap";
import { Id } from "../../../../../convex/_generated/dataModel";

type FormData = {
  taskType: 'restock' | 'putaway';
  inventoryItemId: string;
  purchaseOrderId?: string;
  leadId?: string;
  helperIds?: string[];
};

export function FormComponent({ onClose, propertyId }: { onClose?: () => void; propertyId: string }) {
  const createTask = useMutation(api.inventoryTasks.createInventoryTask);
  const items = useQuery(api.inventoryItems.getAllInventoryItems, { propertyId: propertyId as Id<'properties'> });
  const staffList = useQuery(api.housekeepingTasks.listAssignableStaff, { propertyId: propertyId as Id<'properties'> });
  const purchaseOrders = useQuery(api.purchaseOrders.getAllPurchaseOrders, {
    propertyId: propertyId as Id<'properties'>,
    status: 'received',
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      taskType: 'restock',
      inventoryItemId: '',
      purchaseOrderId: '',
      leadId: '',
      helperIds: [],
    },
  });

  const taskType = watch('taskType');
  const selectedLead = watch('leadId');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (data.taskType === 'putaway' && !data.purchaseOrderId) {
        toast.error('Putaway tasks require a received purchase order');
        return;
      }
      const response = await createTask({
        propertyId: propertyId as Id<'properties'>,
        taskType: data.taskType,
        inventoryItemId: data.inventoryItemId as Id<'inventoryItems'>,
        purchaseOrderId: data.purchaseOrderId ? (data.purchaseOrderId as Id<'purchaseOrders'>) : undefined,
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
          window.location.href = "/admin/inventory-management/tasks";
        }, 1500);
      }
    } catch (error) {
      console.error("Add new inventory task failed:", error);
      toast.error("Failed to add new inventory task. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createInventoryTaskForm'>
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="taskType" className="block mb-2">Task type *</label>
          <select id="taskType" {...register('taskType')} className="w-full border rounded p-2">
            <option value="restock">Restock</option>
            <option value="putaway">Putaway</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="inventoryItemId" className="block mb-2">Item *</label>
          <select id="inventoryItemId" {...register('inventoryItemId')} className="w-full border rounded p-2">
            <option value="">Select item</option>
            {(items?.data ?? []).map((item: { _id: string; name: string }) => (
              <option key={item._id} value={item._id}>{item.name}</option>
            ))}
          </select>
          {errors.inventoryItemId && <span className="text-red-500 text-sm">{errors.inventoryItemId.message}</span>}
        </div>
      </div>

      {taskType === 'putaway' && (
        <div className="w-full mb-2 lg:mb-4">
          <label htmlFor="purchaseOrderId" className="block mb-2">Received purchase order *</label>
          <select id="purchaseOrderId" {...register('purchaseOrderId')} className="w-full border rounded p-2">
            <option value="">Select purchase order</option>
            {(purchaseOrders?.data ?? []).map((order: { _id: string; orderNumber: string }) => (
              <option key={order._id} value={order._id}>{order.orderNumber}</option>
            ))}
          </select>
        </div>
      )}

      <div className="w-full mb-2 lg:mb-4">
        <label htmlFor="leadId" className="block mb-2">Lead</label>
        <select id="leadId" {...register('leadId')} className="w-full border rounded p-2">
          <option value="">Default department supervisor</option>
          {(staffList ?? []).map((row) => (
            <option key={row._id} value={row._id}>{row.firstName} {row.lastName}</option>
          ))}
        </select>
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
