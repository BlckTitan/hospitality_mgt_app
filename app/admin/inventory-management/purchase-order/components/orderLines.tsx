'use client';

import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { formatPropertyMoney, usePropertyCurrency } from '../../components/money';

export function OrderLines({
  purchaseOrderId,
  propertyId,
}: {
  purchaseOrderId: Id<'purchaseOrders'>;
  propertyId: Id<'properties'>;
}) {
  const order = useQuery(api.purchaseOrders.getPurchaseOrder, { purchaseOrderId });
  const items = useQuery(api.inventoryItems.getAllInventoryItems, { propertyId });
  const addLine = useMutation(api.purchaseOrderLines.createPurchaseOrderLine);
  const deleteLine = useMutation(api.purchaseOrderLines.deletePurchaseOrderLine);
  const receive = useMutation(api.purchaseOrders.receivePurchaseOrder);
  const currency = usePropertyCurrency(propertyId);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('inventory.create');
  const canUpdate = hasGranularPermission('inventory.update');
  const canDelete = hasGranularPermission('inventory.delete');

  const [inventoryItemId, setInventoryItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [receivedDraft, setReceivedDraft] = useState<Record<string, string>>({});

  const lines = order?.data?.lines ?? [];
  const catalog = (items?.data ?? []).filter((item) => item.isActive);

  const handleAdd = async () => {
    if (!inventoryItemId) {
      toast.error('Select an inventory item');
      return;
    }
    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    const response = await addLine({
      propertyId,
      purchaseOrderId,
      inventoryItemId: inventoryItemId as Id<'inventoryItems'>,
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
    });
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    toast.success(response.message);
    setInventoryItemId('');
    setQuantity('1');
    setUnitPrice('0');
  };

  const handleReceive = async (markReceived: boolean) => {
    const payload = lines.map((line) => ({
      purchaseOrderLineId: line._id,
      receivedQuantity: Number(receivedDraft[line._id] ?? line.receivedQuantity ?? 0),
    }));
    const response = await receive({
      purchaseOrderId,
      lines: payload,
      markReceived,
    });
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    toast.success(response.message);
  };

  if (order === undefined) {
    return <p className="p-4">Loading lines</p>;
  }

  return (
    <section className="mt-8">
      <h5 className="mb-2">Order lines</h5>
      <p className="text-sm text-slate-600 mb-3">
        Add items here. Receive goods to increase on-hand. Completing putaway later does not add stock again.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Item</th>
              <th className="p-2">Ordered</th>
              <th className="p-2">Unit price</th>
              <th className="p-2">Received</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td className="p-3" colSpan={5}>No lines yet. Add the first item below.</td>
              </tr>
            )}
            {lines.map((line) => (
              <tr key={line._id} className="border-t">
                <td className="p-2">
                  {line.inventoryItem?.name || 'Item'}
                  <div className="text-xs text-slate-500">{line.inventoryItem?.sku}</div>
                </td>
                <td className="p-2">{line.quantity} {line.inventoryItem?.unit || ''}</td>
                <td className="p-2">{formatPropertyMoney(line.unitPrice, currency)}</td>
                <td className="p-2">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-24"
                    min={0}
                    value={receivedDraft[line._id] ?? String(line.receivedQuantity ?? 0)}
                    onChange={(event) =>
                      setReceivedDraft((current) => ({ ...current, [line._id]: event.target.value }))
                    }
                    disabled={!canUpdate || order.data?.status === 'cancelled'}
                  />
                </td>
                <td className="p-2">
                  {canDelete && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={async () => {
                        const result = await deleteLine({ purchaseOrderLineId: line._id });
                        if (result.success) toast.success(result.message);
                        else toast.error(result.message);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canCreate && order.data?.status !== 'received' && order.data?.status !== 'cancelled' && (
        <div className="flex flex-wrap gap-2 items-end mt-3">
          <label className="flex flex-col text-sm">
            Item
            <select
              className="border rounded px-2 py-1 mt-1 min-w-56"
              value={inventoryItemId}
              onChange={(event) => setInventoryItemId(event.target.value)}
            >
              <option value="">Select an item</option>
              {catalog.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            Qty
            <input
              className="border rounded px-2 py-1 mt-1 w-24"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className="flex flex-col text-sm">
            Unit price ({currency})
            <input
              className="border rounded px-2 py-1 mt-1 w-28"
              type="number"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
            />
          </label>
          <Button variant="dark" size="sm" onClick={handleAdd}>Add line</Button>
        </div>
      )}

      {canUpdate && lines.length > 0 && order.data?.status !== 'cancelled' && (
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="dark" onClick={() => handleReceive(false)}>Receive goods</Button>
          {order.data?.status !== 'received' && (
            <Button variant="outline-dark" onClick={() => handleReceive(true)}>
              Receive and mark received
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
