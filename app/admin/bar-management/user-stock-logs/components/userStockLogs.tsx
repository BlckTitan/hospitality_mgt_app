'use client'

import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";

interface UserStockLogProps {
  _id: string;
  propertyId: string;
  shiftId: string;
  beverageId: string;
  openingStock: number;
  newStockReceived: number;
  totalStock: number;
  closingStock: number;
  salesQuantity: number;
  salesValue: number;
  recordedAt: number;
  shift?: {
    _id: string;
    userId: string;
    barId: string;
    shiftDate: string;
    startTime: string;
    endTime?: string;
    isFinalized: boolean;
  };
  beverage?: {
    _id: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    unitPrice: number;
    isActive: boolean;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  bar?: {
    _id: string;
    name: string;
    location: string;
    barType: string;
    isActive: boolean;
  };
}

const UserStockLogs = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const stockLogData = useQuery(api.userStockLogs.getAllUserStockLogs, { propertyId: currentPropertyId });
  const removeUserStockLog = useMutation(api.userStockLogs.deleteUserStockLog);

  const handleDelete = async (id: string, beverageName: string) => {
    if (!confirm('Are you sure you want to delete stock log for: ' + beverageName + '?')) return;
    try {
      const response = await removeUserStockLog({ stockLogId: id as Id<'userStockLogs'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/user-stock-logs";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete user stock log! ${error}`);
      toast.error("Failed to delete user stock log. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getShiftStatusBadge = (isFinalized: boolean) => {
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${isFinalized ? 'bg-green-600' : 'bg-yellow-600'}`}>
        {isFinalized ? 'Finalized' : 'Active'}
      </p>
    );
  };

  const tableColumns: TableColumn<UserStockLogProps>[] = [
    {
      label: 'Date',
      key: 'shift',
      render: (value, row) => (
        <span>{row.shift?.shiftDate || 'N/A'}</span>
      )
    },
    {
      label: 'User',
      key: 'user',
      render: (value, row) => (
        <span>{row.user?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Bar',
      key: 'bar',
      render: (value, row) => (
        <span>{row.bar?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Beverage',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Opening Stock',
      key: 'openingStock',
      render: (value, row) => (
        <span>{row.openingStock} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'New Stock',
      key: 'newStockReceived',
      render: (value, row) => (
        <span>{row.newStockReceived} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Total Stock',
      key: 'totalStock',
      render: (value, row) => (
        <span className="font-semibold">{row.totalStock} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Closing Stock',
      key: 'closingStock',
      render: (value, row) => (
        <span>{row.closingStock} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Sales Quantity',
      key: 'salesQuantity',
      render: (value, row) => (
        <span className={row.salesQuantity > 0 ? 'text-green-600 font-semibold' : 'text-gray-600'}>
          {row.salesQuantity} {row.beverage?.unitOfMeasure || 'units'}
        </span>
      )
    },
    {
      label: 'Sales Value',
      key: 'salesValue',
      render: (value, row) => (
        <span className={row.salesValue > 0 ? 'text-green-600 font-semibold' : 'text-gray-600'}>
          {formatCurrency(row.salesValue)}
        </span>
      )
    },
    {
      label: 'Shift Status',
      key: 'shift',
      render: (value, row) => (
        <span>{row.shift ? getShiftStatusBadge(row.shift.isFinalized) : 'N/A'}</span>
      )
    },
    {
      label: 'Recorded At',
      key: 'recordedAt',
      render: (value, row) => (
        <span>{formatDate(row.recordedAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/bar-management/user-stock-logs/edit?stock_log_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
            title={row.shift?.isFinalized ? 'Cannot edit - shift is finalized' : 'Edit stock log'}
          >
            <i className={`icon ${row.shift?.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <MdEditDocument />
            </i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.beverage?.name || 'Unknown')}
            title={row.shift?.isFinalized ? 'Cannot delete - shift is finalized' : 'Delete stock log'}
            disabled={row.shift?.isFinalized}
          >
            <i className={`icon ${row.shift?.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
          collectionName='userStockLogs' 
          columns={tableColumns}
          jointTableData={(stockLogData?.success === true) && stockLogData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default UserStockLogs;
