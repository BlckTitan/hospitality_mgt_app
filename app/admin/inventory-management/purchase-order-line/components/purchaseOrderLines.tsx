import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";

interface PurchaseOrderLineProps {
  _id: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
  createdAt: number;
  updatedAt: number;
  inventoryItem?: any;
  purchaseOrder?: any;
}

const PurchaseOrderLines = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const purchaseOrderLinesResponse = useQuery(api.purchaseOrderLines.getAllPurchaseOrderLines, currentPropertyId ? { propertyId: currentPropertyId } : "skip");
  const removePurchaseOrderLine = useMutation(api.purchaseOrderLines.deletePurchaseOrderLine);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order line?')) return;
    try {
      const response = await removePurchaseOrderLine({ 
        purchaseOrderLineId: id as Id<'purchaseOrderLines'> 
      });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/inventory-management/purchase-order-line";
        }, 3000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete purchase order line! ${error}`);
      toast.error("Failed to delete purchase order line. Please try again.");
    }
  };

  const tableColumns: TableColumn<PurchaseOrderLineProps>[] = [
    {
      label: 'Purchase Order',
      key: 'purchaseOrder',
      render: (value, row) => (
        <span>{row.purchaseOrder?.orderNumber || 'N/A'}</span>
      )
    },
    {
      label: 'Item Name',
      key: 'inventoryItem',
      render: (value, row) => (
        <span>{row.inventoryItem?.name || 'N/A'}</span>
      )
    },
    {
      label: 'SKU',
      key: 'inventoryItem',
      render: (value, row) => (
        <span>{row.inventoryItem?.sku || 'N/A'}</span>
      )
    },
    {
      label: 'Quantity',
      key: 'quantity',
      render: (value, row) => (
        <span>{row.quantity.toFixed(2)}</span>
      )
    },
    {
      label: 'Unit Price',
      key: 'unitPrice',
      render: (value, row) => (
        <span>${row.unitPrice.toFixed(2)}</span>
      )
    },
    {
      label: 'Total Price',
      key: 'totalPrice',
      render: (value, row) => (
        <span>${row.totalPrice.toFixed(2)}</span>
      )
    },
    {
      label: 'Received Qty',
      key: 'receivedQuantity',
      render: (value, row) => (
        <span>{row.receivedQuantity ? row.receivedQuantity.toFixed(2) : '0.00'}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/inventory-management/purchase-order-line/edit?purchase_order_line_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id)}
            title='Delete purchase order line'
          >
            <i className='icon'>
              <FcEmptyTrash />
            </i>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent 
          collectionName='purchaseOrderLines' 
          columns={tableColumns}
          jointTableData={(purchaseOrderLinesResponse?.success === true) && purchaseOrderLinesResponse?.data}  
        />
      </Suspense>
    </div>
  );
};

export default PurchaseOrderLines;
