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
  | 'tasks'
  | 'count';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'This page is the property inventory position: on-hand value, items at or below reorder point, open purchase orders, goods still due in, overdue tasks, and shortages. Draft order creates a purchase for the reorder quantity. A shortage means a sale or task needed more than was on the shelf. On-hand stops at zero.',
  items:
    'Create a catalog item with +. Opening quantity posts an adjustment transaction so the ledger matches on-hand. Use Reorder point to flag low stock on this list and the hub. Change quantity later with a stock movement, not by editing the item.',
  'items-edit':
    'Update SKU, name, category, supplier, or reorder settings. On-hand quantity is read-only. Unit cost is the average from receipts. Use Correct unit cost only when that average is wrong, and say why.',
  transactions:
    'Record a stock movement with +. Purchase, usage, and waste apply to one location. Transfer moves the same quantity from one location to another and leaves the property total unchanged. A count posts adjustments when the shelf does not match the book.',
  'transactions-edit':
    'Correct the type, quantity, cost, or reason. Saving reverses the old effect on on-hand and applies the new one. Linked purchase-order receipts should be changed from the purchase order Receive goods action instead.',
  suppliers:
    'Add a vendor with +. Active suppliers appear on catalog items and purchase orders. Do not delete a supplier that still has items or orders.',
  'suppliers-edit':
    'Change contact details, payment terms, or active status. Existing items and purchase orders keep this supplier until you reassign them.',
  orders:
    'Create a purchase order header with +, then open it to add lines and receive goods into a location. Receiving posts purchase movements. Mark as paid is available after the order is received, and it records the cash outflow on Expenses.',
  'orders-edit':
    'Edit the header, add lines, choose where the goods go, then enter received quantities and click Receive goods. Mark as received when the delivery is complete. Record payment only after that. Putaway shelves the goods. It does not add stock again.',
  tasks:
    'Restock tasks open when on-hand falls to the reorder point. Putaway tasks open after a purchase order is received. Completing a task does not change quantity. Draft or receive the order, or log a movement.',
  count:
    'Pick a location and count every active item there. Book is what the system has at that shelf. Posting sets that shelf to the counted quantity and records the difference as an adjustment.',
};

export function InventoryPageGuide({ page }: { page: GuidePage }) {
  return <p className="text-gray-600">{DESCRIPTIONS[page]}</p>;
}
