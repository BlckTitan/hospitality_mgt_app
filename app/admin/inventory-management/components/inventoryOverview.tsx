'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { usePermissions } from '../../../../hooks/usePermissions';
import { formatPropertyMoney, usePropertyCurrency } from './money';

const TABS = ['Low stock', 'Open purchase orders', 'Incoming goods', 'Overdue tasks'] as const;

function formatDate(value?: number) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function InventoryOverview({ propertyId }: { propertyId: Id<'properties'> }) {
  const dashboard = useQuery(api.inventoryItems.getInventoryDashboard, { propertyId });
  const currency = usePropertyCurrency(propertyId);
  const { hasGranularPermission } = usePermissions();
  const canRead = hasGranularPermission('inventory.read');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Low stock');

  if (dashboard === undefined) {
    return <p className="p-4">Loading</p>;
  }
  if (!dashboard.success || !dashboard.data) {
    return <p className="p-4">Could not load inventory position.</p>;
  }

  const data = dashboard.data;

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3 mb-6">
        {canRead && (
          <>
            <Link href="/admin/inventory-management/inventory-item" className="border px-3 py-2">
              Inventory items
            </Link>
            <Link href="/admin/inventory-management/inventory-transaction" className="border px-3 py-2">
              Stock movements
            </Link>
            <Link href="/admin/inventory-management/supplier" className="border px-3 py-2">
              Suppliers
            </Link>
            <Link href="/admin/inventory-management/purchase-order" className="border px-3 py-2">
              Purchase orders
            </Link>
            <Link href="/admin/inventory-management/tasks" className="border px-3 py-2">
              Inventory tasks
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="border p-3">
          <p className="text-sm text-slate-600">Active items</p>
          <p className="text-2xl font-semibold">{data.activeItemCount}</p>
        </div>
        <div className="border p-3">
          <p className="text-sm text-slate-600">On-hand value</p>
          <p className="text-2xl font-semibold">{formatPropertyMoney(data.stockValue, currency)}</p>
        </div>
        <div className="border p-3">
          <p className="text-sm text-slate-600">Low stock</p>
          <p className="text-2xl font-semibold text-red-600">{data.lowStockCount}</p>
        </div>
        <div className="border p-3">
          <p className="text-sm text-slate-600">Open purchase orders</p>
          <p className="text-2xl font-semibold">{data.openPoCount}</p>
          <p className="text-xs text-slate-500">{formatPropertyMoney(data.openPoValue, currency)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? 'dark' : 'outline-secondary'}
            onClick={() => setTab(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      {tab === 'Low stock' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-2">Item</th>
                <th className="p-2">On hand</th>
                <th className="p-2">Reorder</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStock.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={3}>No items are at or below reorder point.</td>
                </tr>
              )}
              {data.lowStock.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-2">
                    <a href={`/admin/inventory-management/inventory-item/edit?inventory_item_id=${row._id}`}>
                      {row.name}
                    </a>
                    <div className="text-xs text-slate-500">{row.sku}</div>
                  </td>
                  <td className="p-2">{row.currentQuantity} {row.unit}</td>
                  <td className="p-2">{row.reorderPoint ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Open purchase orders' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-2">Order</th>
                <th className="p-2">Status</th>
                <th className="p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.openOrders.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={3}>No open purchase orders.</td>
                </tr>
              )}
              {data.openOrders.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-2">
                    <a href={`/admin/inventory-management/purchase-order/edit?purchase_order_id=${row._id}`}>
                      {row.orderNumber}
                    </a>
                  </td>
                  <td className="p-2 capitalize">{row.status}</td>
                  <td className="p-2">{formatPropertyMoney(row.totalAmount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Incoming goods' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-2">Order</th>
                <th className="p-2">Supplier</th>
                <th className="p-2">Still due</th>
                <th className="p-2">Expected</th>
              </tr>
            </thead>
            <tbody>
              {data.incoming.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={4}>Nothing outstanding on open orders.</td>
                </tr>
              )}
              {data.incoming.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-2">
                    <a href={`/admin/inventory-management/purchase-order/edit?purchase_order_id=${row._id}`}>
                      {row.orderNumber}
                    </a>
                  </td>
                  <td className="p-2">{row.supplierName}</td>
                  <td className="p-2">{row.outstandingQty}</td>
                  <td className="p-2">{formatDate(row.expectedDeliveryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Overdue tasks' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-2">Task</th>
                <th className="p-2">Item</th>
                <th className="p-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {data.overdueTasks.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={3}>No overdue inventory tasks.</td>
                </tr>
              )}
              {data.overdueTasks.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-2 capitalize">
                    <a href={`/admin/inventory-management/tasks/edit?task_id=${row._id}`}>
                      {row.taskType}
                    </a>
                  </td>
                  <td className="p-2">{row.itemName}</td>
                  <td className="p-2">{formatDate(row.dueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
