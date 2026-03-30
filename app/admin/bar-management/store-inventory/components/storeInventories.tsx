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

interface StoreInventoryProps {
  _id: string;
  propertyId: string;
  beverageId: string;
  qtyInStore: number;
  reorderThreshold: number;
  lastUpdated: number;
  beverage?: {
    _id: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    unitPrice: number;
    reorderLevel: number;
    isActive: boolean;
  };
}

const StoreInventories = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const storeInventoryData = useQuery(api.storeInventories.getAllStoreInventories, { propertyId: currentPropertyId });
  const removeStoreInventory = useMutation(api.storeInventories.deleteStoreInventory);

  const handleDelete = async (id: string, beverageName: string) => {
    if (!confirm('Are you sure you want to delete store inventory for: ' + beverageName + '?')) return;
    try {
      const response = await removeStoreInventory({ id: id as Id<'storeInventories'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/bar-management/store-inventory";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete store inventory! ${error}`);
      toast.error("Failed to delete store inventory. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStockStatusBadge = (qtyInStore: number, reorderThreshold: number) => {
    if (qtyInStore <= reorderThreshold) {
      return (
        <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm bg-red-600`}>
          Low Stock
        </p>
      );
    } else if (qtyInStore <= reorderThreshold * 2) {
      return (
        <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm bg-yellow-600`}>
          Medium Stock
        </p>
      );
    } else {
      return (
        <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm bg-green-600`}>
          Good Stock
        </p>
      );
    }
  };

  const tableColumns: TableColumn<StoreInventoryProps>[] = [
    {
      label: 'Beverage',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Category',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.category || 'N/A'}</span>
      )
    },
    {
      label: 'Unit of Measure',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.unitOfMeasure || 'N/A'}</span>
      )
    },
    {
      label: 'Quantity in Store',
      key: 'qtyInStore',
      render: (value, row) => (
        <span className="font-semibold">{row.qtyInStore} {row.beverage?.unitOfMeasure || ''}</span>
      )
    },
    {
      label: 'Reorder Threshold',
      key: 'reorderThreshold',
      render: (value, row) => (
        <span>{row.reorderThreshold} {row.beverage?.unitOfMeasure || ''}</span>
      )
    },
    {
      label: 'Stock Status',
      key: 'qtyInStore',
      render: (value, row) => getStockStatusBadge(row.qtyInStore, row.reorderThreshold)
    },
    {
      label: 'Last Updated',
      key: 'lastUpdated',
      render: (value, row) => (
        <span>{formatDate(row.lastUpdated)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/bar-management/store-inventory/edit?inventory_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.beverage?.name || 'Unknown')}
            title='Delete store inventory'
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
          collectionName='storeInventories' 
          columns={tableColumns}
          jointTableData={(storeInventoryData?.success === true) && storeInventoryData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default StoreInventories;
