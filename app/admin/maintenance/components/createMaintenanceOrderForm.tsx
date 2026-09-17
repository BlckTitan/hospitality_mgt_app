'use client';

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import SelectComponent from "../../../../shared/select";
import { Field, fieldRowClassName, fieldWidthClass } from "../../../../shared/field";
import { Button, Modal } from "react-bootstrap";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  MaintenancePartsFields,
  optionalMoney,
  serializeParts,
  type MaintenancePartDraft,
} from "./maintenancePartsFields";

type FormData = {
  title: string;
  description: string;
  orderType: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCost?: number;
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
  const catalog = useQuery(api.maintenanceOrders.listPartsCatalog, {
    propertyId: propertyId as Id<'properties'>,
  }) ?? [];
  const [parts, setParts] = useState<MaintenancePartDraft[]>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      orderType: 'corrective',
      priority: 'medium',
      estimatedCost: undefined,
      leadId: '',
      helperIds: [],
      supplierId: '',
    },
  });

  const selectedLead = watch('leadId');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const serializedParts = serializeParts(parts);
      const response = await createOrder({
        propertyId: propertyId as Id<'properties'>,
        title: data.title,
        description: data.description,
        orderType: data.orderType,
        priority: data.priority,
        estimatedCost: optionalMoney(data.estimatedCost),
        supplierId: data.supplierId ? (data.supplierId as Id<'suppliers'>) : undefined,
        leadId: data.leadId ? (data.leadId as Id<'staffs'>) : undefined,
        helperIds: (data.helperIds ?? [])
          .filter((id) => id && id !== data.leadId)
          .map((id) => id as Id<'staffs'>),
        parts: serializedParts,
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
      <div className={fieldRowClassName}>
        <InputComponent
          id="title"
          label="Title *"
          type="text"
          inputWidth="w-1/2"
          register={register('title')}
          error={errors.title}
        />
        <SelectComponent
          id="orderType"
          label="Order type *"
          selectWidth="w-1/2"
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
        <Field id="description" label="Description *" widthClass={fieldWidthClass('w-full')}>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full max-w-full min-w-0 p-2 border rounded-sm"
            placeholder="What needs to be repaired or inspected, and where?"
          />
          {errors.description && <span className="text-red-500 text-sm">{errors.description.message}</span>}
        </Field>
      </div>

      <div className={fieldRowClassName}>
        <SelectComponent
          id="priority"
          label="Priority *"
          selectWidth="w-1/2"
          register={register('priority')}
          error={errors.priority}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
        />
        <InputComponent
          id="estimatedCost"
          label="Estimated cost"
          type="number"
          inputWidth="w-1/2"
          step="0.01"
          register={register('estimatedCost')}
          error={errors.estimatedCost}
          placeholder="0.00"
        />
      </div>

      <div className={fieldRowClassName}>
        <SelectComponent
          id="supplierId"
          label="Vendor (optional)"
          selectWidth="w-1/2"
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
        <SelectComponent
          id="leadId"
          label="Lead"
          selectWidth="w-1/2"
          register={register('leadId')}
          error={errors.leadId}
          options={[
            { value: '', label: 'Default department supervisor' },
            ...(staffList ?? []).map((row) => ({
              value: row._id,
              label: `${row.firstName} ${row.lastName}`,
            })),
          ]}
        />
      </div>

      <div className={fieldRowClassName}>
        <Field id="helpers" label="Helpers (optional)" widthClass={fieldWidthClass('w-full')}>
          <div className="w-full max-w-full min-w-0 flex flex-col gap-1 max-h-32 overflow-y-auto border rounded-sm p-2">
            {(staffList ?? []).filter((row) => row._id !== selectedLead).map((row) => (
              <label key={row._id} className="flex items-center gap-2">
                <input type="checkbox" value={row._id} {...register('helperIds')} className='mr-2'/>
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

      <Modal.Footer>
        <Button type="submit" variant='dark'>Submit</Button>
      </Modal.Footer>
    </form>
  );
}
