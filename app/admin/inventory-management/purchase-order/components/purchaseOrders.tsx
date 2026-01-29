'use client'

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { Id } from "../../../../../convex/_generated/dataModel";

interface PurchaseOrderProps {
  _id: string;
  propertyId: string;
  supplierId: string;
  orderNumber: string;
  orderDate: number;
  expectedDeliveryDate?: number;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount?: number;
  totalAmount: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: number;
  receivedAt?: number;
  createdAt: number;
  updatedAt: number;
  supplier?: any;
  lines?: any[];
}

const PurchaseOrders = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const purchaseOrdersData = useQuery(api.purchaseOrders.getAllPurchaseOrders, { propertyId: currentPropertyId });
  const removePurchaseOrder = useMutation(api.purchaseOrders.deletePurchaseOrder);

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm('Are you sure you want to delete purchase order: ' + orderNumber + '?')) return;
    try {
      const response = await removePurchaseOrder({ purchaseOrderId: id as Id<'purchaseOrders'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/inventory-management/purchase-order";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete purchase order! ${error}`);
      toast.error("Failed to delete purchase order. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'draft': 'bg-gray-400',
      'sent': 'bg-blue-500',
      'confirmed': 'bg-purple-500',
      'received': 'bg-green-600',
      'cancelled': 'bg-red-600',
    };
    return statusColors[status] || 'bg-gray-400';
  };

  const tableColumns: TableColumn<PurchaseOrderProps>[] = [
    { label: 'Order Number', key: 'orderNumber' },
    {
      label: 'Supplier',
      key: 'supplier',
      render: (value, row) => (
        <span>{row.supplier?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Order Date',
      key: 'orderDate',
      render: (value, row) => (
        <span>{formatDate(row.orderDate)}</span>
      )
    },
    {
      label: 'Expected Delivery',
      key: 'expectedDeliveryDate',
      render: (value, row) => (
        <span>{row.expectedDeliveryDate ? formatDate(row.expectedDeliveryDate) : 'N/A'}</span>
      )
    },
    {
      label: 'Total Amount',
      key: 'totalAmount',
      render: (value, row) => (
        <span>${row.totalAmount.toFixed(2)}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => (
        <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${getStatusBadge(row.status)}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </p>
      )
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span>{formatDate(row.createdAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/inventory-management/purchase-order/edit?purchase_order_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.orderNumber)}
            title='Delete purchase order'
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
          collectionName='purchaseOrders' 
          columns={tableColumns}
          jointTableData={(purchaseOrdersData?.success === true) && purchaseOrdersData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default PurchaseOrders;
