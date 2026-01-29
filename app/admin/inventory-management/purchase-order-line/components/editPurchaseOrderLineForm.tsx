import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import InputComponent from "../../../../../shared/input";

type FormData = {
  purchaseOrderId: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
};

interface EditPurchaseOrderLineFormProps {
  purchaseOrderLineData: any;
  purchaseOrderLineId: string;
}

export function EditFormComponent({ 
  purchaseOrderLineData, 
  purchaseOrderLineId
}: EditPurchaseOrderLineFormProps) {
  const updatePurchaseOrderLine = useMutation(api.purchaseOrderLines.updatePurchaseOrderLine);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      purchaseOrderId: purchaseOrderLineData.purchaseOrderId || '',
      inventoryItemId: purchaseOrderLineData.inventoryItemId || '',
      quantity: purchaseOrderLineData.quantity ?? 1,
      unitPrice: purchaseOrderLineData.unitPrice ?? 0,
      totalPrice: purchaseOrderLineData.totalPrice ?? 0,
      receivedQuantity: purchaseOrderLineData.receivedQuantity ?? 0,
    },
  });

  const quantity = watch('quantity');
  const unitPrice = watch('unitPrice');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const totalPrice = Number(quantity) * Number(unitPrice);

      const response = await updatePurchaseOrderLine({
        purchaseOrderLineId: purchaseOrderLineId as Id<'purchaseOrderLines'>,
        quantity: Number(data.quantity),
        unitPrice: Number(data.unitPrice),
        totalPrice: totalPrice,
        receivedQuantity: data.receivedQuantity ? Number(data.receivedQuantity) : undefined,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Purchase order line updated successfully!');
        setTimeout(() => {
          window.location.href = '/admin/inventory-management/purchase-order-line';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update purchase order line failed:', error);
      toast.error('Failed to update purchase order line. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editPurchaseOrderLineForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Purchase Order (Read-only)</label>
          <input
            type="text"
            disabled
            value={purchaseOrderLineData.purchaseOrder?.orderNumber || 'N/A'}
            className="w-full border rounded p-2 bg-gray-100"
          />
          <p className="text-sm text-gray-500 mt-1">Cannot change purchase order</p>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Inventory Item (Read-only)</label>
          <input
            type="text"
            disabled
            value={`${purchaseOrderLineData.inventoryItem?.name} (${purchaseOrderLineData.inventoryItem?.sku})`}
            className="w-full border rounded p-2 bg-gray-100"
          />
          <p className="text-sm text-gray-500 mt-1">Cannot change inventory item</p>
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
        <Button variant="secondary">
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Update Purchase Order Line
        </Button>
      </div>
    </form>
  );
}
