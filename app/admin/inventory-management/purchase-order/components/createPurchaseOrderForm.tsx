'use client'

import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { formatPropertyMoney, usePropertyCurrency } from "../../components/money";

type FormData = {
  orderNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount?: number;
  totalAmount: number;
};

interface CreatePurchaseOrderFormProps {
  suppliers: any[];
  onSuccess: () => void;
  onClose: () => void;
  propertyId: string;
}

export function FormComponent({ 
  suppliers, 
  onSuccess, 
  onClose, 
  propertyId,
}: CreatePurchaseOrderFormProps) {
  const createPurchaseOrder = useMutation(api.purchaseOrders.createPurchaseOrder);
  const currency = usePropertyCurrency(propertyId);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      orderNumber: '',
      supplierId: '',
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: '',
      status: 'draft',
      subtotal: 0,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: 0,
    },
  });

  const subtotal = watch('subtotal');
  const taxAmount = watch('taxAmount');
  const shippingAmount = watch('shippingAmount') || 0;

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const totalAmount = Number(subtotal) + Number(taxAmount) + Number(shippingAmount);
      
      const response = await createPurchaseOrder({
        propertyId: propertyId as Id<'properties'>,
        supplierId: data.supplierId as Id<'suppliers'>,
        orderNumber: data.orderNumber,
        orderDate: new Date(data.orderDate).getTime(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).getTime() : undefined,
        status: data.status,
        subtotal: Number(data.subtotal),
        taxAmount: Number(data.taxAmount),
        shippingAmount: data.shippingAmount ? Number(data.shippingAmount) : undefined,
        totalAmount: totalAmount,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Purchase order created successfully!');
        reset();
        onSuccess();
      }
    } catch (error: any) {
      console.error('Create purchase order failed:', error);
      toast.error('Failed to create purchase order. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createPurchaseOrderForm">
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
            <option value="cancelled">Cancelled</option>
          </select>
          {errors.status && <span className="text-red-600 text-sm">{errors.status.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="subtotal"
            label={`Subtotal (${currency}) *`}
            type="number"
            inputWidth="w-full"
            register={register('subtotal', { required: true })}
            error={errors.subtotal}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="taxAmount"
            label={`Tax Amount (${currency}) *`}
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
            label={`Shipping Amount (${currency})`}
            type="number"
            inputWidth="w-full"
            register={register('shippingAmount')}
            error={errors.shippingAmount}
          />
        </div>
        <div className="flex-1">
          <div className="p-3 bg-gray-100 rounded">
            <p className="text-sm font-medium">Total Amount</p>
            <p className="text-2xl font-bold">{formatPropertyMoney(Number(subtotal) + Number(taxAmount) + Number(shippingAmount), currency)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Create Purchase Order
        </Button>
      </div>
    </form>
  );
}
