'use client'

import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { usePermissions } from "../../../../../hooks/usePermissions";
import { formatPropertyMoney, usePropertyCurrency } from "../../components/money";

function signedQuantity(type: string, quantity: number) {
  if (type === 'usage' || type === 'waste') return -Math.abs(quantity);
  return quantity;
}

export default function InventoryTransactions({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) {
  const transactionsData = useQuery(api.inventoryTransactions.getAllInventoryTransactions, { propertyId: currentPropertyId });
  const currency = usePropertyCurrency(currentPropertyId);
  const removeTransaction = useMutation(api.inventoryTransactions.deleteInventoryTransaction);
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission('inventory.update');
  const canDelete = hasGranularPermission('inventory.delete');

  const handleDelete = async (id: string, itemName: string, transactionType: string) => {
    if (!confirm(`Are you sure you want to delete this ${transactionType} transaction for ${itemName}?`)) return;
    try {
      const response = await removeTransaction({ transactionId: id as Id<'inventoryTransactions'> });
      if (response.success === true) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete transaction! ${error}`);
      toast.error("Failed to delete transaction. Please try again.");
    }
  };

  if (transactionsData === undefined) {
    return <p className="p-4">Loading</p>;
  }

  const rows = transactionsData.success ? transactionsData.data : [];

  return (
    <div className="w-full h-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Type</th>
              <th className="p-2">Item</th>
              <th className="p-2">Quantity</th>
              <th className="p-2">Unit cost</th>
              <th className="p-2">Total cost</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={8}>No stock movements found.</td>
              </tr>
            )}
            {rows.map((row) => {
              const qty = signedQuantity(row.transactionType, row.quantity);
              return (
                <tr key={row._id} className="border-t">
                  <td className="p-2">{new Date(row.transactionDate).toLocaleString()}</td>
                  <td className="p-2 capitalize">{row.transactionType}</td>
                  <td className="p-2">
                    <div className="font-semibold">{row.inventoryItem?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{row.inventoryItem?.sku || ''}</div>
                  </td>
                  <td className={`p-2 ${qty < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {qty > 0 ? '+' : ''}{qty} {row.inventoryItem?.unit || ''}
                  </td>
                  <td className="p-2">{formatPropertyMoney(row.unitCost, currency)}</td>
                  <td className="p-2">{formatPropertyMoney(row.totalCost, currency)}</td>
                  <td className="p-2">{row.reason || '—'}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {canUpdate && (
                        <a
                          href={`/admin/inventory-management/inventory-transaction/edit?transaction_id=${row._id}`}
                          className="!no-underline !text-amber-400"
                        >
                          <MdEditDocument />
                        </a>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(row._id, row.inventoryItem?.name || 'item', row.transactionType)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
