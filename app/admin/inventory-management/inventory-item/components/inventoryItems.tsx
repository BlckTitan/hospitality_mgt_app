'use client'

import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { usePermissions } from "../../../../../hooks/usePermissions";
import { formatPropertyMoney, usePropertyCurrency } from "../../components/money";

export default function InventoryItems({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) {
  const inventoryItemsData = useQuery(api.inventoryItems.getAllInventoryItems, { propertyId: currentPropertyId });
  const currency = usePropertyCurrency(currentPropertyId);
  const removeInventoryItem = useMutation(api.inventoryItems.deleteInventoryItem);
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission('inventory.update');
  const canDelete = hasGranularPermission('inventory.delete');

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete inventory item: ' + name + '?')) return;
    try {
      const response = await removeInventoryItem({ inventoryItemId: id as Id<'inventoryItems'> });
      if (response.success === true) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete inventory item! ${error}`);
      toast.error("Failed to delete inventory item. Please try again.");
    }
  };

  if (inventoryItemsData === undefined) {
    return <p className="p-4">Loading</p>;
  }

  const rows = inventoryItemsData.success ? inventoryItemsData.data : [];

  return (
    <div className="w-full h-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">SKU</th>
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Supplier</th>
              <th className="p-2">Quantity</th>
              <th className="p-2">Unit cost</th>
              <th className="p-2">Location</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={9}>No inventory items found.</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.sku}</td>
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.category}</td>
                <td className="p-2">{row.supplier?.name || '—'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span>{row.currentQuantity} {row.unit}</span>
                    {row.reorderPoint !== undefined && row.currentQuantity <= row.reorderPoint && (
                      <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">Low stock</span>
                    )}
                  </div>
                </td>
                <td className="p-2">{formatPropertyMoney(row.unitCost, currency)}</td>
                <td className="p-2">{row.location || '—'}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-white ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <a
                        href={`/admin/inventory-management/inventory-item/edit?inventory_item_id=${row._id}`}
                        className="!no-underline !text-amber-400"
                      >
                        <MdEditDocument />
                      </a>
                    )}
                    {canDelete && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(row._id, row.name)}>
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
