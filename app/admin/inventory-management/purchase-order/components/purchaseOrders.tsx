'use client'

import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { usePermissions } from "../../../../../hooks/usePermissions";
import { formatPropertyMoney, usePropertyCurrency } from "../../components/money";

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-gray-400',
  sent: 'bg-blue-500',
  confirmed: 'bg-purple-500',
  received: 'bg-green-600',
  cancelled: 'bg-red-600',
};

export default function PurchaseOrders({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) {
  const purchaseOrdersData = useQuery(api.purchaseOrders.getAllPurchaseOrders, { propertyId: currentPropertyId });
  const currency = usePropertyCurrency(currentPropertyId);
  const removePurchaseOrder = useMutation(api.purchaseOrders.deletePurchaseOrder);
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission('inventory.update');
  const canDelete = hasGranularPermission('inventory.delete');

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm('Are you sure you want to delete purchase order: ' + orderNumber + '?')) return;
    try {
      const response = await removePurchaseOrder({ purchaseOrderId: id as Id<'purchaseOrders'> });
      if (response.success === true) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete purchase order! ${error}`);
      toast.error("Failed to delete purchase order. Please try again.");
    }
  };

  if (purchaseOrdersData === undefined) {
    return <p className="p-4">Loading</p>;
  }

  const rows = purchaseOrdersData.success ? purchaseOrdersData.data : [];

  return (
    <div className="w-full h-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Order</th>
              <th className="p-2">Supplier</th>
              <th className="p-2">Date</th>
              <th className="p-2">Lines</th>
              <th className="p-2">Total</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={7}>No purchase orders found.</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.orderNumber}</td>
                <td className="p-2">{row.supplier?.name || '—'}</td>
                <td className="p-2">{new Date(row.orderDate).toLocaleDateString()}</td>
                <td className="p-2">{row.lines?.length ?? 0}</td>
                <td className="p-2">{formatPropertyMoney(row.totalAmount, currency)}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-white ${STATUS_CLASS[row.status] || 'bg-gray-400'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <a
                        href={`/admin/inventory-management/purchase-order/edit?purchase_order_id=${row._id}`}
                        className="!no-underline !text-amber-400"
                      >
                        <MdEditDocument />
                      </a>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(row._id, row.orderNumber)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
