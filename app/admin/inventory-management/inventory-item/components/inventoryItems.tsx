'use client'

import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { Id } from "../../../../../convex/_generated/dataModel";

interface InventoryItemProps {
  _id: string;
  propertyId: string;
  supplierId?: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitCost?: number;
  lastCostUpdate?: number;
  location?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  supplier?: {
    _id: string;
    name: string;
  };
}

const InventoryItems = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const inventoryItemsData = useQuery(api.inventoryItems.getAllInventoryItems, { propertyId: currentPropertyId });
  const removeInventoryItem = useMutation(api.inventoryItems.deleteInventoryItem);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete inventory item: ' + name + '?')) return;
    try {
      const response = await removeInventoryItem({ inventoryItemId: id as Id<'inventoryItems'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/inventory-management/inventory-item";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete inventory item! ${error}`);
      toast.error("Failed to delete inventory item. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getLowStockBadge = (currentQuantity: number, reorderPoint?: number) => {
    if (reorderPoint !== undefined && currentQuantity <= reorderPoint) {
      return (
        <p className="w-fit h-fit px-2 py-1 text-white rounded-sm bg-red-600">
          Low Stock
        </p>
      );
    }
    return null;
  };

  const tableColumns: TableColumn<InventoryItemProps>[] = [
    { label: 'SKU', key: 'sku' },
    { label: 'Name', key: 'name' },
    {
      label: 'Category',
      key: 'category',
      render: (value, row) => (
        <span className="capitalize">{row.category}</span>
      )
    },
    {
      label: 'Supplier',
      key: 'supplier',
      render: (value, row) => (
        <span>{row.supplier?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Quantity',
      key: 'currentQuantity',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span>{row.currentQuantity} {row.unit}</span>
          {getLowStockBadge(row.currentQuantity, row.reorderPoint)}
        </div>
      )
    },
    {
      label: 'Unit Cost',
      key: 'unitCost',
      render: (value, row) => (
        <span>{formatCurrency(row.unitCost)}</span>
      )
    },
    {
      label: 'Location',
      key: 'location',
      render: (value, row) => (
        <span>{row.location || 'N/A'}</span>
      )
    },
    {
      label: 'Active',
      key: 'isActive',
      render: (value, row) => (
        <p
          className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
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
            href={`/admin/inventory-management/inventory-item/edit?inventory_item_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
            title='Delete inventory item'
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
          collectionName='inventoryItems' 
          columns={tableColumns}
          jointTableData={(inventoryItemsData?.success === true) && inventoryItemsData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default InventoryItems;
