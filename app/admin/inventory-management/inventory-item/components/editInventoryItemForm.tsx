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
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitCost?: number;
  location?: string;
  supplierId?: string;
  isActive: boolean;
};

interface EditInventoryItemFormProps {
  inventoryItemData: any;
  inventoryItemId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditInventoryItemForm({ inventoryItemData, inventoryItemId, onSuccess, onClose }: EditInventoryItemFormProps) {
  const updateInventoryItem = useMutation(api.inventoryItems.updateInventoryItem);

  const suppliersResponse = useQuery(api.suppliers.getAllSuppliers, {
    propertyId: inventoryItemData.propertyId as Id<'properties'>,
    activeOnly: true,
  });
  const suppliers = suppliersResponse?.data || [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      sku: inventoryItemData.sku || '',
      name: inventoryItemData.name || '',
      category: inventoryItemData.category || '',
      unit: inventoryItemData.unit || '',
      currentQuantity: inventoryItemData.currentQuantity ?? 0,
      reorderPoint: inventoryItemData.reorderPoint,
      reorderQuantity: inventoryItemData.reorderQuantity,
      unitCost: inventoryItemData.unitCost,
      location: inventoryItemData.location || '',
      supplierId: inventoryItemData.supplierId || '',
      isActive: inventoryItemData.isActive ?? true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateInventoryItem({
        inventoryItemId: inventoryItemId as Id<'inventoryItems'>,
        supplierId: data.supplierId ? (data.supplierId as Id<'suppliers'>) : undefined,
        sku: data.sku,
        name: data.name,
        category: data.category,
        unit: data.unit,
        currentQuantity: data.currentQuantity,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        unitCost: data.unitCost,
        location: data.location,
        isActive: data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Inventory item updated successfully!');
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/inventory-management/inventory-item';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update inventory item failed:', error);
      toast.error('Failed to update inventory item. Please try again.');
    }
  };

  const unitOptions = [
    { value: 'piece', label: 'Piece' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'liter', label: 'Liter (L)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'can', label: 'Can' },
    { value: 'roll', label: 'Roll' },
    { value: 'sheet', label: 'Sheet' },
    { value: 'other', label: 'Other' },
  ];

  const categoryOptions = [
    { value: 'F&B Ingredient', label: 'F&B Ingredient' },
    { value: 'Cleaning Supply', label: 'Cleaning Supply' },
    { value: 'Amenity', label: 'Amenity' },
    { value: 'Spare Part', label: 'Spare Part' },
    { value: 'Office Supply', label: 'Office Supply' },
    { value: 'Linen', label: 'Linen' },
    { value: 'Other', label: 'Other' },
  ];

  const supplierOptions = suppliers.map((supplier: any) => ({
    value: supplier._id,
    label: supplier.name,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editInventoryItemForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="sku"
            label="SKU *"
            type="text"
            inputWidth="w-full"
            register={register('sku', { required: true })}
            error={errors.sku}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="name"
            label="Name *"
            type="text"
            inputWidth="w-full"
            register={register('name', { required: true })}
            error={errors.name}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="category" className="block mb-2">Category *</label>
          <select
            id="category"
            {...register('category', { required: true })}
            className="w-full border rounded p-2"
            defaultValue={inventoryItemData.category}
          >
            <option disabled value="">Select a category</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.category && <span className="text-red-500 text-sm">{errors.category.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="unit" className="block mb-2">Unit *</label>
          <select
            id="unit"
            {...register('unit', { required: true })}
            className="w-full border rounded p-2"
            defaultValue={inventoryItemData.unit}
          >
            <option disabled value="">Select a unit</option>
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.unit && <span className="text-red-500 text-sm">{errors.unit.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="currentQuantity"
            label="Current Quantity *"
            type="number"
            inputWidth="w-full"
            register={register('currentQuantity', { required: true, valueAsNumber: true, min: 0 })}
            error={errors.currentQuantity}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="unitCost"
            label="Unit Cost"
            type="number"
            inputWidth="w-full"
            // step="0.01"
            register={register('unitCost', { valueAsNumber: true, min: 0 })}
            error={errors.unitCost}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="reorderPoint"
            label="Reorder Point"
            type="number"
            inputWidth="w-full"
            register={register('reorderPoint', { valueAsNumber: true, min: 0 })}
            error={errors.reorderPoint}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="reorderQuantity"
            label="Reorder Quantity"
            type="number"
            inputWidth="w-full"
            register={register('reorderQuantity', { valueAsNumber: true, min: 0 })}
            error={errors.reorderQuantity}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="supplierId" className="block mb-2">Supplier</label>
          <select
            id="supplierId"
            {...register('supplierId')}
            className="w-full border rounded p-2"
            defaultValue={inventoryItemData.supplierId || ''}
          >
            <option value="">None</option>
            {supplierOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.supplierId && <span className="text-red-500 text-sm">{errors.supplierId.message}</span>}
        </div>
        <div className="flex-1">
          <InputComponent
            id="location"
            label="Location"
            type="text"
            inputWidth="w-full"
            register={register('location')}
            error={errors.location}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <label className="flex !items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isActive')}
            defaultChecked={inventoryItemData.isActive ?? true}
            className="mr-2 !w-4 !h-3"
          />
          <span className='p-1 ml-2'>Active</span>
        </label>
        <span className="text-sm text-gray-500">Inactive items will not appear in purchase orders</span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Update Inventory Item
        </Button>
      </div>
    </form>
  );
}
