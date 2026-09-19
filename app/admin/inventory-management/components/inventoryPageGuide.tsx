'use client';

type GuidePage =
  | 'hub'
  | 'items'
  | 'items-edit'
  | 'transactions'
  | 'transactions-edit'
  | 'suppliers'
  | 'suppliers-edit'
  | 'orders'
  | 'orders-edit'
  | 'tasks';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'This page is the property inventory position: on-hand value, items at or below reorder point, open purchase orders, goods still due in, and overdue restock or putaway tasks. Add catalog items first, then record movements or receive a purchase order. Completing an inventory task does not change stock — receive goods or log a transaction to do that.',
  items:
    'Create a catalog item with +. Opening quantity posts an adjustment transaction so the ledger matches on-hand. Use Reorder point to flag low stock on this list and the hub. Change quantity later with a stock movement, not by editing the item.',
  'items-edit':
    'Update SKU, name, category, supplier, location, or reorder settings. On-hand quantity is read-only here. Record a purchase, usage, waste, or adjustment on Stock movements to change it.',
  transactions:
    'Record a stock movement with +. Purchase adds stock. Usage and waste remove it. Adjustment can be positive or negative. Purchase-order receipts and maintenance parts also post here automatically.',
  'transactions-edit':
    'Correct the type, quantity, cost, or reason. Saving reverses the old effect on on-hand and applies the new one. Linked purchase-order receipts should be changed from the purchase order Receive goods action instead.',
  suppliers:
    'Add a vendor with +. Active suppliers appear on catalog items and purchase orders. Do not delete a supplier that still has items or orders.',
  'suppliers-edit':
    'Change contact details, payment terms, or active status. Existing items and purchase orders keep this supplier until you reassign them.',
  orders:
    'Create a purchase order header with +, then open it to add lines and receive goods. Receiving posts purchase movements to stock and can start a putaway task. Mark as paid records the cash outflow on Expenses. Lines are not a separate area.',
  'orders-edit':
    'Edit the header, add lines, then enter received quantities and click Receive goods. That is the only way receipt increases on-hand. Mark as received when the delivery is complete. Putaway is a task to shelf the goods, not a second stock increase.',
  tasks:
    'Restock tasks open when on-hand falls to the reorder point. Putaway tasks open after a purchase order is received. Start and complete work here. Completing a task does not change quantity — receive the order or log a movement first.',
};

export function InventoryPageGuide({ page }: { page: GuidePage }) {
  return <p className="mb-4 text-sm text-gray-600">{DESCRIPTIONS[page]}</p>;
}
