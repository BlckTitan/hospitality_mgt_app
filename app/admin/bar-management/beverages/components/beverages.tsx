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

interface BeverageProps {
  _id: string;
  propertyId: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  unitPrice: number;
  reorderLevel: number;
  isActive: boolean;
  _creationTime: number;
}

const Beverages = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const beverageData = useQuery(api.beverages.getBeverages, { propertyId: currentPropertyId });
  const removeBeverage = useMutation(api.beverages.deleteBeverage);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete beverage: ' + name + '?')) return;
    try {
      const response = await removeBeverage({ beverageId: id as Id<'beverages'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/bar-management/beverages";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete beverage! ${error}`);
      toast.error("Failed to delete beverage. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

  const tableColumns: TableColumn<BeverageProps>[] = [
    { label: 'Name', key: 'name' },
    { label: 'Category', key: 'category' },
    { label: 'Unit', key: 'unitOfMeasure' },
    {
      label: 'Unit Price',
      key: 'unitPrice',
      render: (value) => <span>${Number(value).toFixed(2)}</span>
    },
    {
      label: 'Reorder Level',
      key: 'reorderLevel' 
    },
    {
      label: 'Active',
      key: 'isActive',
      render: (value, row) => (
        <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      )
    },
    {
      label: 'Created At',
      key: '_creationTime',
      render: (value, row) => <span>{formatDate(row._creationTime)}</span>
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a href={`/admin/bar-management/beverages/edit?beverage_id=${row._id}`} className='!mr-2 !no-underline !text-amber-400'>
            <i className='icon'><MdEditDocument /></i>
          </a>
          <Button variant='white' onClick={() => handleDelete(row._id, row.name)} title='Delete beverage'>
            <i className='icon'><FcEmptyTrash /></i>
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent
          collectionName='beverages'
          columns={tableColumns}
          jointTableData={(beverageData?.success === true) && beverageData?.data}
        />
      </Suspense>
    </div>
  );
};

export default Beverages;
