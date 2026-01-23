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

interface InventoryTransactionProps {
  _id: string;
  inventoryItemId: string;
  transactionType: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  performedBy?: string;
  transactionDate: number;
  createdAt: number;
  inventoryItem?: {
    _id: string;
    name: string;
    sku: string;
    unit: string;
  };
  performedByStaff?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

const InventoryTransactions = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const transactionsData = useQuery(api.inventoryTransactions.getAllInventoryTransactions, { propertyId: currentPropertyId });
  const removeTransaction = useMutation(api.inventoryTransactions.deleteInventoryTransaction);

  const handleDelete = async (id: string, itemName: string, transactionType: string) => {
    if (!confirm(`Are you sure you want to delete this ${transactionType} transaction for ${itemName}?`)) return;
    try {
      const response = await removeTransaction({ transactionId: id as Id<'inventoryTransactions'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/inventory-management/inventory-transaction";
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

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTransactionTypeBadge = (type: string) => {
    const typeConfig: Record<string, { bg: string; text: string }> = {
      'purchase': { bg: 'bg-green-600', text: 'Purchase' },
      'usage': { bg: 'bg-blue-600', text: 'Usage' },
      'adjustment': { bg: 'bg-yellow-600', text: 'Adjustment' },
      'waste': { bg: 'bg-red-600', text: 'Waste' },
      'transfer': { bg: 'bg-purple-600', text: 'Transfer' },
    };

    const config = typeConfig[type] || { bg: 'bg-gray-400', text: type };
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
        {config.text}
      </p>
    );
  };

  const formatQuantity = (quantity: number, unit?: string) => {
    const sign = quantity >= 0 ? '+' : '';
    return `${sign}${quantity} ${unit || ''}`.trim();
  };

  const tableColumns: TableColumn<InventoryTransactionProps>[] = [
    {
      label: 'Date',
      key: 'transactionDate',
      render: (value, row) => (
        <span>{formatDate(row.transactionDate)}</span>
      )
    },
    {
      label: 'Type',
      key: 'transactionType',
      render: (value, row) => getTransactionTypeBadge(row.transactionType)
    },
    {
      label: 'Item',
      key: 'inventoryItem',
      render: (value, row) => (
        <div>
          <div className="font-semibold">{row.inventoryItem?.name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{row.inventoryItem?.sku || ''}</div>
        </div>
      )
    },
    {
      label: 'Quantity',
      key: 'quantity',
      render: (value, row) => (
        <span className={row.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatQuantity(row.quantity, row.inventoryItem?.unit)}
        </span>
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
      label: 'Total Cost',
      key: 'totalCost',
      render: (value, row) => (
        <span>{formatCurrency(row.totalCost)}</span>
      )
    },
    {
      label: 'Performed By',
      key: 'performedByStaff',
      render: (value, row) => (
        <span>
          {row.performedByStaff 
            ? `${row.performedByStaff.firstName} ${row.performedByStaff.lastName}`
            : 'N/A'}
        </span>
      )
    },
    {
      label: 'Reason',
      key: 'reason',
      render: (value, row) => (
        <span className="max-w-xs truncate" title={row.reason || ''}>
          {row.reason || 'N/A'}
        </span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/inventory-management/inventory-transaction/edit?transaction_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.inventoryItem?.name || 'item', row.transactionType)}
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
          collectionName='inventoryTransactions' 
          columns={tableColumns}
          jointTableData={(transactionsData?.success === true) && transactionsData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default InventoryTransactions;
