'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import PaginationComponent from '../../../../../shared/pagination';
import { toast } from 'sonner';
import { MdDelete, MdEdit } from 'react-icons/md';
import Link from 'next/link';
import { TableColumn } from '../../../../../shared/table';
import { Id } from '../../../../../convex/_generated/dataModel';

interface TableProps {
  _id: string;
  propertyId: string;
  tableNumber: string;
  capacity: number;
  section?: string;
  status: string;
  currentOrderId?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export function Tables(props: any) {
  const { currentPropertyId } = props;

  // Fetch tables for the current property
  const tablesResponse = useQuery(api.tables.getAllTables, {
    propertyId: currentPropertyId as Id<'properties'>,
  });

  const tables = tablesResponse?.data || [];
  const deleteTableMutation = useMutation(api.tables.deleteTable);

  const handleDelete = async (tableId: string) => {
    if (confirm('Are you sure you want to delete this table?')) {
      try {
        const result = await deleteTableMutation({
          tableId: tableId as Id<'tables'>,
          propertyId: currentPropertyId as Id<'properties'>,
        });

        if (result.success) {
          toast.success('Table deleted successfully');
        } else {
          toast.error(result.message || 'Failed to delete table');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete table');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusBgClass = 
      status === 'available' ? 'bg-green-600' :
      status === 'occupied' ? 'bg-red-600' :
      status === 'reserved' ? 'bg-yellow-600' :
      'bg-gray-600';
    
    return (
      <p className={`${statusBgClass} text-white w-fit px-2 py-1 rounded-sm text-sm`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </p>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const tableColumns: TableColumn<TableProps>[] = [
    { label: 'Table Number', key: 'tableNumber' },
    {
      label: 'Capacity',
      key: 'capacity',
      render: (value, row) => (
        <span>{row.capacity} seat{row.capacity > 1 ? 's' : ''}</span>
      ),
    },
    {
      label: 'Section',
      key: 'section',
      render: (value, row) => (
        <span>{row.section || '-'}</span>
      ),
    },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => getStatusBadge(row.status),
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span>{formatDate(row.createdAt)}</span>
      ),
    },
    {
      label: 'Actions',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <Link
            href={`/admin/food-n-beverage/table/edit?tableId=${row._id}`}
            className='!no-underline !text-amber-400 !mr-2'
          >
            <i className='icon'><MdEdit size={18} /></i>
          </Link>
          <button
            onClick={() => handleDelete(row._id)}
            className='bg-white border-0 p-0 cursor-pointer'
            title='Delete table'
          >
            <i className='icon'><MdDelete size={18} color='red' /></i>
          </button>
        </div>
      ),
    },
  ];
  console.log(tables)
  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <PaginationComponent
        collectionName='tables'
        columns={tableColumns}
        jointTableData={(tablesResponse?.success === true) && tables}
      />
    </div>
  );
}
