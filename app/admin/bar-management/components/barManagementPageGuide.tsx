'use client';

type GuidePage =
  | 'bars'
  | 'beverages'
  | 'my-stock'
  | 'stock-requests'
  | 'user-stock-logs'
  | 'store-inventory'
  | 'store-transactions'
  | 'store-count';

const DESCRIPTIONS: Record<GuidePage, string> = {
  bars: 'Create each service point with + (Main, Lounge, or Seat Out). Bars are where stock is issued and where staff close the day. Keep inactive bars off the issue and stock-log lists; do not delete a bar that still has transactions or logs.',
  beverages:
    'Add sellable drinks with +. Set category, unit, sell price, cost (or link inventory / recipe lines), and reorder level. Reorder level drives hub alerts when store stock is low. Create beverages before store inventory or issues.',
  'my-stock':
    'Your float ledger for today. Opening comes from the last finalized close; Received updates when the store issues stock (including approved requests). Enter Closing, Waste, and Comps, then Save — Sales is Total − Closing − Waste − Comps. Request stock when you need replenishment. Finalize today when counts are done.',
  'stock-requests':
    'Waiters submit replenishment lines for a bar. Store staff Approve to issue stock (store qty down, waiter Received up) or Reject. Pending requests also appear on the bar hub.',
  'user-stock-logs':
    'Admin view of staff daily stock sheets. Use + to open a log for a bar, then an actively employed user assigned to that bar, and a beverage (opening from the last finalized close). Filter by bar, bar staff, or date. Staff normally close the day on My stock today; use this list to review or correct logs.',
  'store-inventory':
    'On-hand quantity for each beverage in the central store. Add a row with + (starts at 0). Set reorder threshold for hub alerts. Change quantity with Store transactions or a posted Store count — not by editing the row alone.',
  'store-transactions':
    'Record a store movement with +. Receive adds stock to the store. Issue removes it and posts to that staff member’s My stock today for the chosen bar. Count adjustments appear after a posted store count. Transactions are dated today in the property timezone.',
  'store-count':
    'Physical count of the central bar store. Start a draft to snapshot book qty, enter counted amounts, Save, then Post. Posting sets on-hand to counted and records variance as count adjustments. Does not change waiter float logs.',
};

export function BarManagementPageGuide({ page }: { page: GuidePage }) {
  return <p className="mb-4 text-sm text-gray-600">{DESCRIPTIONS[page]}</p>;
}
