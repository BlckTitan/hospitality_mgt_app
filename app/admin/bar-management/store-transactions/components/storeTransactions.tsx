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

interface StoreTransactionProps {
  _id: string;
  propertyId: string;
  beverageId: string;
  barId?: string;
  userId?: string;
  txnType: 'receive' | 'issue';
  qty: number;
  txnDate: number;
  notes?: string;
  beverage?: {
    _id: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    unitPrice: number;
  };
  bar?: {
    _id: string;
    name: string;
    location: string;
    barType: string;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
  };
}

const StoreTransactions = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const transactionData = useQuery(api.storeTransactions.getAllStoreTransactions, { propertyId: currentPropertyId });
  const removeTransaction = useMutation(api.storeTransactions.deleteStoreTransaction);

  const handleDelete = async (id: string, transactionInfo: string) => {
    if (!confirm('Are you sure you want to delete this transaction: ' + transactionInfo + '?')) return;
    try {
      const response = await removeTransaction({ transactionId: id as Id<'storeTransactions'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/bar-management/store-transactions";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete transaction! ${error}`);
      toast.error("Failed to delete transaction. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTransactionTypeBadge = (txnType: string) => {
    const typeConfig: Record<string, { bg: string; text: string }> = {
      'receive': { bg: 'bg-green-600', text: 'Receive' },
      'issue': { bg: 'bg-blue-600', text: 'Issue' },
    };

    const config = typeConfig[txnType] || { bg: 'bg-gray-400', text: txnType };
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
        {config.text}
      </p>
    );
  };

  const tableColumns: TableColumn<StoreTransactionProps>[] = [
    {
      label: 'Date',
      key: 'txnDate',
      render: (value, row) => (
        <span>{formatDate(row.txnDate)}</span>
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
      label: 'Type',
      key: 'txnType',
      render: (value, row) => getTransactionTypeBadge(row.txnType)
    },
    {
      label: 'Quantity',
      key: 'qty',
      render: (value, row) => (
        <span>{row.qty} {row.beverage?.unitOfMeasure || 'units'}</span>
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
      label: 'User',
      key: 'user',
      render: (value, row) => (
        <span>{row.user?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Notes',
      key: 'notes',
      render: (value, row) => (
        <span className="max-w-xs truncate" title={row.notes || ''}>
          {row.notes || '-'}
        </span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/bar-management/store-transactions/edit?transaction_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, `${row.txnType} ${row.qty} ${row.beverage?.name || ''}`)}
            title='Delete transaction'
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
          collectionName='storeTransactions' 
          columns={tableColumns}
          jointTableData={(transactionData?.success === true) && transactionData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default StoreTransactions;
