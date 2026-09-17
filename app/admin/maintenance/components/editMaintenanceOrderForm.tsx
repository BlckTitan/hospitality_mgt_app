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
import SelectComponent from "../../../../shared/select";
import { Field, fieldRowClassName, fieldWidthClass } from "../../../../shared/field";
import { useState } from "react";
import {
  MaintenancePartsFields,
  emptyPart,
  optionalMoney,
  serializeParts,
  type MaintenancePartDraft,
} from "./maintenancePartsFields";

type FormData = {
  title: string;
  description: string;
  orderType: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCost?: number;
  actualCost?: number;
  leadId?: string;
  helperIds?: string[];
  supplierId?: string;
  notes?: string;
};

type ExistingPart = {
  inventoryItemId?: Id<'inventoryItems'>;
  name: string;
  quantity: number;
  unitCost: number;
};

export function FormComponent({
  id,
  title,
  description,
  orderType,
  status,
  priority,
  estimatedCost,
  actualCost,
  leadId,
  helperIds,
  supplierId,
  notes,
  propertyId,
  parts: existingParts,
}: {
  id: Id<'maintenanceOrders'>;
  title: string;
  description?: string;
  orderType: string;
  status: string;
  priority: string;
  estimatedCost?: number;
  actualCost?: number;
  leadId?: string;
  helperIds?: string[];
  supplierId?: string;
  notes?: string;
  propertyId: string;
  parts?: ExistingPart[];
}) {
  const updateOrder = useMutation(api.maintenanceOrders.updateMaintenanceOrder);
  const staffList = useQuery(api.housekeepingTasks.listAssignableStaff, { propertyId: propertyId as Id<'properties'> });
  const suppliers = useQuery(api.suppliers.getAllSuppliers, {
    propertyId: propertyId as Id<'properties'>,
    activeOnly: true,
  });
  const catalog = useQuery(api.maintenanceOrders.listPartsCatalog, {
    propertyId: propertyId as Id<'properties'>,
  }) ?? [];
  const [parts, setParts] = useState<MaintenancePartDraft[]>(
    (existingParts ?? []).map((part) => ({
      ...emptyPart(),
      inventoryItemId: part.inventoryItemId ?? '',
      name: part.name,
      quantity: String(part.quantity),
      unitCost: String(part.unitCost),
    })),
  );

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      title,
      description: description || '',
      orderType: orderType as FormData['orderType'],
      status: status as FormData['status'],
      priority: priority as FormData['priority'],
      estimatedCost,
      actualCost,
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
        description: data.description,
        orderType: data.orderType,
        status: data.status,
        priority: data.priority,
        estimatedCost: optionalMoney(data.estimatedCost),
        actualCost: optionalMoney(data.actualCost),
        supplierId: data.supplierId ? (data.supplierId as Id<'suppliers'>) : undefined,
        leadId: data.leadId ? (data.leadId as Id<'staffs'>) : undefined,
        helperIds: (data.helperIds ?? [])
          .filter((helperId) => helperId && helperId !== data.leadId)
          .map((helperId) => helperId as Id<'staffs'>),
        notes: data.notes || undefined,
        parts: serializeParts(parts),
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
      <div className={fieldRowClassName}>
        <InputComponent
          id="title"
          label="Title *"
          type="text"
          inputWidth="w-4/12"
          register={register('title')}
          error={errors.title}
        />
        <SelectComponent
          id="orderType"
          label="Order type *"
          selectWidth="w-4/12"
          register={register('orderType')}
          error={errors.orderType}
          options={[
            { value: 'preventive', label: 'Preventive' },
            { value: 'corrective', label: 'Corrective' },
            { value: 'emergency', label: 'Emergency' },
            { value: 'inspection', label: 'Inspection' },
          ]}
        />
      </div>

      <div className={fieldRowClassName}>
        <Field id="description" label="Description *" widthClass={fieldWidthClass('w-8/12')}>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full max-w-full lg:max-w-8/12 min-w-0 p-2 border rounded-sm"
            placeholder="What needs to be repaired or inspected, and where?"
          />
          {errors.description && <span className="text-red-500 text-sm">{errors.description.message}</span>}
        </Field>
      </div>

      <div className={fieldRowClassName}>
        <SelectComponent
          id="status"
          label="Status *"
          selectWidth="w-4/12"
          register={register('status')}
          error={errors.status}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in-progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <SelectComponent
          id="priority"
          label="Priority *"
          selectWidth="w-4/12"
          register={register('priority')}
          error={errors.priority}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
        />
      </div>

      <div className={fieldRowClassName}>
        <InputComponent
          id="estimatedCost"
          label="Estimated cost"
          type="number"
          inputWidth="w-4/12"
          step="0.01"
          register={register('estimatedCost')}
          error={errors.estimatedCost}
          placeholder="0.00"
        />
        <InputComponent
          id="actualCost"
          label="Actual cost"
          type="number"
          inputWidth="w-4/12"
          step="0.01"
          register={register('actualCost')}
          error={errors.actualCost}
          placeholder="Leave blank to use items total"
        />
      </div>

      <div className={fieldRowClassName}>
        <SelectComponent
          id="leadId"
          label="Lead"
          selectWidth="w-4/12"
          register={register('leadId')}
          error={errors.leadId}
          options={[
            { value: '', label: 'Unassigned' },
            ...(staffList ?? []).map((row) => ({
              value: row._id,
              label: `${row.firstName} ${row.lastName}`,
            })),
          ]}
        />
        <SelectComponent
          id="supplierId"
          label="Vendor (optional)"
          selectWidth="w-4/12"
          register={register('supplierId')}
          error={errors.supplierId}
          options={[
            { value: '', label: 'None' },
            ...(suppliers?.data ?? []).map((supplier: { _id: string; name: string }) => ({
              value: supplier._id,
              label: supplier.name,
            })),
          ]}
        />
      </div>

      <div className={fieldRowClassName}>
        <Field id="helpers" label="Helpers (optional)" widthClass={fieldWidthClass('w-full')}>
          <div className="w-full max-w-full lg:max-w-8/12 min-w-0 flex flex-col gap-1 max-h-32 overflow-y-auto border rounded-sm p-2">
            {(staffList ?? []).filter((row) => row._id !== selectedLead).map((row) => (
              <label key={row._id} className="flex items-center gap-2">
                <input type="checkbox" value={row._id} {...register('helperIds')} />
                <span className='ml-2'>{row.firstName} {row.lastName}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>

      <MaintenancePartsFields
        parts={parts}
        onChange={setParts}
        catalog={catalog}
      />

      <div className={fieldRowClassName}>
        <Field id="notes" label="Notes" widthClass={fieldWidthClass('w-full')}>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="w-full max-w-full lg:max-w-8/12 min-w-0 p-2 border rounded-sm"
            placeholder="Required when cancelling"
          />
          {errors.notes && <span className="text-red-500 text-sm">{errors.notes.message}</span>}
        </Field>
      </div>

      <Button type="submit" variant='dark'>Submit</Button>
    </form>
  );
}
