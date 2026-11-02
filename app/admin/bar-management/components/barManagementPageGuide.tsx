'use client';

type GuidePage =
  | 'bars'
  | 'beverages'
  | 'beverage-categories'
  | 'my-stock'
  | 'stock-requests'
  | 'user-stock-logs'
  | 'store-inventory'
  | 'store-transactions'
  | 'store-count';

const DESCRIPTIONS: Record<GuidePage, string> = {
  bars: 'Create each service point with + (Main, Lounge, or Seat Out). Use Staff to link the waiters and bartenders who may operate it, and Stock to enter what is already there. The bar keeps that stock when people change. Keep inactive bars off the issue and stock-log lists; do not delete a bar that still has transactions or logs.',
  beverages:
    'Add sellable drinks with +. Set category, unit, sell price, cost (or link inventory / recipe lines), and reorder level. Reorder level drives hub alerts when store stock is low. Create beverages before store inventory or issues. Add a missing drink category from Beverage categories.',
  'beverage-categories':
    'Built-in drink categories stay available. Use + to add a category for this property, such as Craft beer. Deactivate a custom category to hide it from new drinks. Drinks already using it keep that category.',
  'my-stock':
    'The bar you are linked to, for today. Opening is that bar’s last finalized close. Received updates when the store issues stock to the bar (including approved requests). Use Autofill to add every drink the bar still had at the last close, or add one drink at a time. Enter Closing, Waste, and Comps, then Save. Sales is what the count says left after waste and comps. Amount is that quantity times the drink price. POS is what was rung at this bar on checks opened today. Variance is Sales minus POS. Finalize today when the count is done. The next person linked to this bar continues from that close.',
  'stock-requests':
    'Waiters submit replenishment lines for a bar. Store staff Approve to issue stock to that bar (store qty down, bar Received up) or Reject. Pending requests also appear on the bar hub.',
  'user-stock-logs':
    'Admin view of each bar’s daily stock sheet. The totals above the list are for the selected day: opening stock value, total sales value, and the value of stock left, all at selling price. Use + to add a drink to a bar. Opening comes from that bar’s last finalized close. Filter by bar, operator, or date. Staff close the day on My stock today; use this list to review or correct the bar’s logs.',
  'store-inventory':
    'On-hand quantity for each beverage in the central store. Add a row with + and enter Quantity in Store plus a reorder threshold for hub alerts. Later quantity changes go through Store transactions or a posted Store count — not by editing the row alone.',
  'store-transactions':
    'Record a store movement with +. Receive adds stock to the store. Issue removes it and posts to the chosen bar’s stock for today. Count adjustments appear after a posted store count. Transactions are dated today in the property timezone.',
  'store-count':
    'Physical count of the central bar store. Start a draft to snapshot book qty, enter counted amounts, Save, then Post. Posting sets on-hand to counted and records variance as count adjustments. Does not change the stock already at a bar.',
};

export function BarManagementPageGuide({ page }: { page: GuidePage }) {
  return <p className="text-gray-600">{DESCRIPTIONS[page]}</p>;
}
