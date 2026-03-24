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

interface BarProps {
  _id: string;
  propertyId: string;
  name: string;
  location: string;
  barType: string;
  isActive: boolean;
  _creationTime: number;
}

const Bars = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const barData = useQuery(api.bars.getBars, { propertyId: currentPropertyId }); //data from bars
  const removeBar = useMutation(api.bars.deleteBar);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete bar: ' + name + '?')) return;
    try {
      const response = await removeBar({ barId: id as Id<'bars'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/bar-management/bar";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete bar! ${error}`);
      toast.error("Failed to delete bar. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getBarTypeBadge = (barType: string) => {
    const typeConfig: Record<string, { bg: string; text: string }> = {
      'Main': { bg: 'bg-blue-600', text: 'Main' },
      'Lounge': { bg: 'bg-purple-600', text: 'Lounge' },
      'Seat Out': { bg: 'bg-cyan-600', text: 'Seat Out' },
    };

    const config = typeConfig[barType] || { bg: 'bg-gray-400', text: barType };
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
        {config.text}
      </p>
    );
  };

  const tableColumns: TableColumn<BarProps>[] = [
    { label: 'Name', key: 'name' },
    { label: 'Location', key: 'location' },
    {
      label: 'Type',
      key: 'barType',
      render: (value, row) => getBarTypeBadge(row.barType)
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
      key: '_creationTime',
      render: (value, row) => (
        <span>{formatDate(row._creationTime)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/bar-management/bar/edit?bar_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
            title='Delete bar'
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
          collectionName='bars'
          columns={tableColumns}
          jointTableData={(barData?.success === true) && barData?.data}
        />
      </Suspense>
    </div>
  );
};

export default Bars;