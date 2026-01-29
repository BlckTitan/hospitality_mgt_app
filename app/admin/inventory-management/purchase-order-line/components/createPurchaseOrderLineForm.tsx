import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import InputComponent from "../../../../../shared/input";

type FormData = {
  purchaseOrderId: Id<'purchaseOrders'>;
  inventoryItemId: Id<'inventoryItems'>;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createPurchaseOrderLine = useMutation(api.purchaseOrderLines.createPurchaseOrderLine);

  // Fetch purchase orders
  const purchaseOrdersResponse = useQuery(api.purchaseOrders.getAllPurchaseOrders, { 
    propertyId: propertyId as Id<'properties'> // This will be fetched from context
  });
  const purchaseOrders = purchaseOrdersResponse?.data || [];

  // Fetch inventory items
  const inventoryItemsResponse = useQuery(api.inventoryItems.getAllInventoryItems, { 
    propertyId: propertyId as Id<'properties'> // This will be fetched from context
  });
  const inventoryItems = inventoryItemsResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      purchaseOrderId: '',
      inventoryItemId: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      receivedQuantity: 0,
    },
  });

  const quantity = watch('quantity');
  const unitPrice = watch('unitPrice');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const totalPrice = Number(quantity) * Number(unitPrice);

      const response = await createPurchaseOrderLine({
        propertyId: propertyId as Id<'properties'>,
        purchaseOrderId: data.purchaseOrderId as Id<'purchaseOrders'>,
        inventoryItemId: data.inventoryItemId as Id<'inventoryItems'>,
        quantity: Number(data.quantity),
        unitPrice: Number(data.unitPrice),
        totalPrice: totalPrice,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Purchase order line created successfully!');
        reset();
        setTimeout(() => {
          window.location.href = '/admin/inventory-management/purchase-order-line';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Create purchase order line failed:', error);
      toast.error('Failed to create purchase order line. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createPurchaseOrderLineForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="purchaseOrderId" className="block text-sm font-medium mb-1">Purchase Order *</label>
          <select
            id="purchaseOrderId"
            {...register('purchaseOrderId', { required: true })}
            className="w-full border rounded p-2"
          >
            <option value="">Select a purchase order</option>
            {purchaseOrders.map((po: any) => (
              <option key={po._id} value={po._id}>
                {po.orderNumber}
              </option>
            ))}
          </select>
          {errors.purchaseOrderId && <span className="text-red-600 text-sm">{errors.purchaseOrderId.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="inventoryItemId" className="block text-sm font-medium mb-1">Inventory Item *</label>
          <select
            id="inventoryItemId"
            {...register('inventoryItemId', { required: true })}
            className="w-full border rounded p-2"
          >
            <option value="">Select an inventory item</option>
            {inventoryItems.map((item: any) => (
              <option key={item._id} value={item._id}>
                {item.name} ({item.sku})
              </option>
            ))}
          </select>
          {errors.inventoryItemId && <span className="text-red-600 text-sm">{errors.inventoryItemId.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="quantity"
            label="Quantity *"
            type="number"
            inputWidth="w-full"
            register={register('quantity', { required: true })}
            error={errors.quantity}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="unitPrice"
            label="Unit Price *"
            type="number"
            inputWidth="w-full"
            register={register('unitPrice', { required: true })}
            error={errors.unitPrice}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="receivedQuantity"
            label="Received Quantity"
            type="number"
            inputWidth="w-full"
            register={register('receivedQuantity')}
            error={errors.receivedQuantity}
          />
        </div>
        <div className="flex-1">
          <div className="p-3 bg-gray-100 rounded">
            <p className="text-sm font-medium">Total Price</p>
            <p className="text-2xl font-bold">${(Number(quantity) * Number(unitPrice)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" type="reset">
          Clear
        </Button>
        <Button variant="dark" type="submit">
          Create Purchase Order Line
        </Button>
      </div>
    </form>
  );
}
