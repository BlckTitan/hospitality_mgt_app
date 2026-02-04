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

interface FnbMenuItemProps {
  _id: string;
  propertyId: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  cost?: number;
  isAvailable: boolean;
  imageUrl?: string;
  preparationTime?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

const FnbMenuItems = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const menuItemData = useQuery(api.fnbMenuItems.getAllFnbMenuItems, { propertyId: currentPropertyId });
  const removeMenuItem = useMutation(api.fnbMenuItems.deleteFnbMenuItem);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete menu item: ' + name + '?')) return;
    try {
      const response = await removeMenuItem({ menuItemId: id as Id<'fnbMenuItems'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/food-n-beverage/fnb-menu-item";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete menu item! ${error}`);
      toast.error("Failed to delete menu item. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAvailabilityBadge = (isAvailable: boolean) => {
    return (
      <p
        className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${
          isAvailable ? 'bg-green-600' : 'bg-red-600'
        }`}
      >
        {isAvailable ? 'Available' : 'Unavailable'}
      </p>
    );
  };

  const tableColumns: TableColumn<FnbMenuItemProps>[] = [
    { label: 'Name', key: 'name' },
    {
      label: 'Category',
      key: 'category',
      render: (value, row) => (
        <span>{row.category}</span>
      )
    },
    {
      label: 'Price',
      key: 'price',
      render: (value, row) => (
        <span>${row.price.toFixed(2)}</span>
      )
    },
    {
      label: 'Cost',
      key: 'cost',
      render: (value, row) => (
        <span>{row.cost ? `$${row.cost.toFixed(2)}` : 'N/A'}</span>
      )
    },
    {
      label: 'Availability',
      key: 'isAvailable',
      render: (value, row) => getAvailabilityBadge(row.isAvailable)
    },
    {
      label: 'Status',
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
            href={`/admin/food-n-beverage/fnb-menu-item/edit?menu_item_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
            title='Delete menu item'
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
          collectionName='fnbMenuItems' 
          columns={tableColumns}
          jointTableData={(menuItemData?.success === true) && menuItemData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default FnbMenuItems;
