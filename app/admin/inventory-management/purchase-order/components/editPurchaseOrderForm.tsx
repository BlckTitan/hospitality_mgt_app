'use client';

import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  orderNumber: string;
  supplierId: string;
  orderDate: number;
  expectedDeliveryDate?: number;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount?: number;
  totalAmount: number;
};

interface EditPurchaseOrderFormProps {
  purchaseOrderData: any;
  purchaseOrderId: string;
  suppliers: any[];
  onSuccess: () => void;
  onClose: () => void;
}

export function EditPurchaseOrderForm({ 
  purchaseOrderData, 
  purchaseOrderId, 
  suppliers,
  onSuccess, 
  onClose 
}: EditPurchaseOrderFormProps) {
  const updatePurchaseOrder = useMutation(api.purchaseOrders.updatePurchaseOrder);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      orderNumber: purchaseOrderData.orderNumber || '',
      supplierId: purchaseOrderData.supplierId || '',
      orderDate: purchaseOrderData.orderDate || Date.now(),
      expectedDeliveryDate: purchaseOrderData.expectedDeliveryDate,
      status: purchaseOrderData.status || 'draft',
      subtotal: purchaseOrderData.subtotal ?? 0,
      taxAmount: purchaseOrderData.taxAmount ?? 0,
      shippingAmount: purchaseOrderData.shippingAmount ?? 0,
      totalAmount: purchaseOrderData.totalAmount ?? 0,
    },
  });

  const subtotal = watch('subtotal');
  const taxAmount = watch('taxAmount');
  const shippingAmount = watch('shippingAmount') || 0;

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const totalAmount = Number(subtotal) + Number(taxAmount) + Number(shippingAmount);
      
      const response = await updatePurchaseOrder({
        purchaseOrderId: purchaseOrderId as Id<'purchaseOrders'>,
        supplierId: data.supplierId as Id<'suppliers'>,
        orderNumber: data.orderNumber,
        orderDate: Math.floor(new Date(data.orderDate).getTime()),
        expectedDeliveryDate: data.expectedDeliveryDate ? Math.floor(new Date(data.expectedDeliveryDate).getTime()) : undefined,
        status: data.status,
        subtotal: Number(data.subtotal),
        taxAmount: Number(data.taxAmount),
        shippingAmount: data.shippingAmount ? Number(data.shippingAmount) : undefined,
        totalAmount: totalAmount,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Purchase order updated successfully!');
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/inventory-management/purchase-order';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update purchase order failed:', error);
      toast.error('Failed to update purchase order. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editPurchaseOrderForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="orderNumber"
            label="Order Number *"
            type="text"
            inputWidth="w-full"
            register={register('orderNumber', { required: true })}
            error={errors.orderNumber}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="supplierId" className="block text-sm font-medium mb-1">Supplier *</label>
          <select
            id="supplierId"
            {...register('supplierId', { required: true })}
            className="w-full border rounded p-2"
          >
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name}
              </option>
            ))}
          </select>
          {errors.supplierId && <span className="text-red-600 text-sm">{errors.supplierId.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="orderDate"
            label="Order Date *"
            type="date"
            inputWidth="w-full"
            register={register('orderDate', { required: true })}
            error={errors.orderDate}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="expectedDeliveryDate"
            label="Expected Delivery Date"
            type="date"
            inputWidth="w-full"
            register={register('expectedDeliveryDate')}
            error={errors.expectedDeliveryDate}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="status" className="block text-sm font-medium mb-1">Status *</label>
          <select
            id="status"
            {...register('status', { required: true })}
            className="w-full border rounded p-2"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {errors.status && <span className="text-red-600 text-sm">{errors.status.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="subtotal"
            label="Subtotal *"
            type="number"
            inputWidth="w-full"
            register={register('subtotal', { required: true })}
            error={errors.subtotal}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="taxAmount"
            label="Tax Amount *"
            type="number"
            inputWidth="w-full"
            register={register('taxAmount', { required: true })}
            error={errors.taxAmount}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="shippingAmount"
            label="Shipping Amount"
            type="number"
            inputWidth="w-full"
            register={register('shippingAmount')}
            error={errors.shippingAmount}
          />
        </div>
        <div className="flex-1">
          <div className="p-3 bg-gray-100 rounded">
            <p className="text-sm font-medium">Total Amount</p>
            <p className="text-2xl font-bold">${(Number(subtotal) + Number(taxAmount) + Number(shippingAmount)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Update Purchase Order
        </Button>
      </div>
    </form>
  );
}
