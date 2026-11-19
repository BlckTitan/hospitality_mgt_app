'use client';

import { GuideSection, PageGuide } from '../../../../shared/pageGuide';

type GuidePage =
  | 'hub'
  | 'bars'
  | 'beverages'
  | 'beverage-categories'
  | 'my-stock'
  | 'stock-requests'
  | 'user-stock-logs'
  | 'store-inventory'
  | 'store-transactions'
  | 'store-count';

export const BAR_HUB_GUIDE_ID = 'bar-hub';

const GUIDES: Record<GuidePage, GuideSection[] | string> = {
  hub: [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      body: 'Money from drinks the stock count says were sold in the selected period. Sold quantity is opening plus received, minus closing, waste, and comps. Revenue is that quantity times each drink’s selling price. Daily, weekly, and monthly read the stock sheets. Yearly and year-on-year use the yearly rollup of those same sheets. POS checks are not added into this number.',
    },
    {
      id: 'gross-profit',
      title: 'Gross Profit',
      body: 'Total revenue minus the cost of stock that left the bar, including units recorded as waste or comps. Waiters do not see this figure.',
    },
    {
      id: 'pour-cost',
      title: 'Pour cost %',
      body: 'Cost of stock that left the bar, divided by total revenue. The line under the percentage is that cost, then the margin: revenue minus cost, as a share of revenue.',
    },
    {
      id: 'waste-comps',
      title: 'Waste & comps',
      body: 'Units marked waste or complimentary on the stock sheets. They are left out of quantity sold and revenue. Year-on-year does not total this figure.',
    },
    {
      id: 'qty-sold',
      title: 'Total Quantity Sold',
      body: 'Units the stock sheets count as sold for the period: stock that disappeared, after waste and comps. This is the same source as Total Revenue, counted in units instead of money.',
    },
    {
      id: 'active-bars',
      title: 'Active Bars',
      body: 'Bars that have a sales summary for the selected period.',
    },
    {
      id: 'active-staff',
      title: 'Active Staff',
      body: 'Waiters and bartenders with a sales summary in the selected period. An administrator who entered a count is not included.',
    },
    {
      id: 'stock-days',
      title: 'Stock days finalized',
      body: 'How many waiter, bar, and day sessions have every stock line finalized. Yearly and year-on-year look at the last 30 days of stock sheets.',
    },
    {
      id: 'open-reorders',
      title: 'Open reorders',
      body: 'Store alerts still open because bottles on hand are at or below the reorder level. This needs inventory access. The line under the count is the age of the oldest open alert.',
    },
    {
      id: 'stale-reorders',
      title: 'Stale reorders (24h+)',
      body: 'Open or acknowledged reorder alerts that have been waiting at least 24 hours.',
    },
    {
      id: 'stock-requests',
      title: 'Open stock requests',
      body: 'Requests from a bar that are still pending or only partly issued. Review queue opens the request list.',
    },
    {
      id: 'store-variance',
      title: 'Store variance',
      body: 'Net difference on the latest posted count of the central store. A negative number means the count was short of the book. It does not change stock already at a bar.',
    },
    {
      id: 'revenue-per-shift',
      title: 'Revenue / waiter-shift',
      body: 'Stock-sheet revenue divided by waiter and bartender shifts in the period. Yearly and year-on-year use the last 30 days for this figure.',
    },
    {
      id: 'bar-performance',
      title: 'Bar Performance',
      body: 'Revenue and quantity sold for each bar in the selected period, from the stock-sheet sales summaries.',
    },
    {
      id: 'top-performers',
      title: 'Top Performers',
      body: 'Waiters and bartenders ranked by revenue per shift. The table lists shifts, revenue, and revenue per shift.',
    },
    {
      id: 'revenue-trend',
      title: 'Revenue Trend',
      body: 'Stock-sheet revenue across recent days, weeks, months, or years. Year-on-year compares this year with last year, month by month.',
    },
    {
      id: 'sales-by-category',
      title: 'Sales by Category',
      body: 'Share of stock-sheet revenue by drink category for the selected period.',
    },
    {
      id: 'beverage-sales',
      title: 'Beverage Sales',
      body: 'The highest-revenue drinks in the period. Bar height is revenue. The right axis is quantity sold. Both come from the stock sheets.',
    },
    {
      id: 'top-skus',
      title: 'Top SKUs',
      body: 'The five drinks with the highest stock-sheet revenue in the period. Quantity is what the count says was sold, after waste and comps. POS pours are not included. Yearly and year-on-year use the yearly rollup of those stock sheets.',
    },
    {
      id: 'slowest-skus',
      title: 'Slowest SKUs',
      body: 'Up to five drinks with the lowest stock-sheet revenue, leaving out any drink already listed in Top SKUs. The source is the same stock sheets, not POS checks.',
    },
  ],
  bars: [
    {
      id: 'create',
      title: 'Create a bar',
      body: 'Use + to add a service point, such as Main, Lounge, or Seat Out.',
    },
    {
      id: 'staff-stock',
      title: 'Staff and stock',
      body: 'Staff links the waiters and bartenders who may operate the bar. Stock records what is already there. The bar keeps that stock when people change.',
    },
    {
      id: 'inactive',
      title: 'Inactive bars',
      body: 'Keep inactive bars off the issue and stock-log lists. Do not delete a bar that still has transactions or logs.',
    },
  ],
  beverages: [
    {
      id: 'add',
      title: 'Add a drink',
      body: 'Use + and set category, unit, sell price, bottles per crate, and reorder level. Create drinks before store inventory or issues. Add a missing category from Beverage categories.',
    },
    {
      id: 'cost',
      title: 'Bottle cost',
      body: 'Bottle cost comes from crate purchases unless you enter a manual unit cost. Cocktails can use recipe lines instead.',
    },
    {
      id: 'reorder',
      title: 'Reorder level',
      body: 'When store stock falls to this level, the bar hub raises a reorder alert.',
    },
  ],
  'beverage-categories':
    'Built-in drink categories stay available. Use + to add a category for this property, such as Craft beer. Deactivate a custom category to hide it from new drinks. Drinks already using it keep that category.',
  'my-stock': [
    {
      id: 'sheet',
      title: 'This sheet',
      body: 'This is the bar you are linked to. The date starts on today in the property timezone. Pick an earlier date to review that day’s sheet. Older dates stay read-only. Autofill adds any carry-over drink that is still missing.',
    },
    {
      id: 'opening',
      title: 'Opening',
      body: 'Filled from yesterday’s closing count. If yesterday has no sheet, opening comes from the last finalized close.',
    },
    {
      id: 'received',
      title: 'Received',
      body: 'Bottles the store issued to this bar today, including approved stock requests.',
    },
    {
      id: 'total',
      title: 'Total',
      body: 'Opening plus received. This is the stock on hand before closing, waste, and comps.',
    },
    {
      id: 'closing',
      title: 'Closing',
      body: 'The bottles you count still at the bar. Enter it, then Save, or use Save all for every open row.',
    },
    {
      id: 'waste',
      title: 'Waste',
      body: 'Bottles poured out, broken, or otherwise unsellable. Waste is left out of sales quantity and sales amount. The summary card adds waste and comps together.',
    },
    {
      id: 'comps',
      title: 'Comps',
      body: 'Bottles given away. Comps are left out of sales quantity and sales amount.',
    },
    {
      id: 'sales',
      title: 'Sales',
      body: 'What the count says was sold: opening plus received, minus closing, waste, and comps. Qty sold on the summary uses this figure.',
    },
    {
      id: 'amount',
      title: 'Amount',
      body: 'Sales quantity times the drink’s selling price. Revenue on the summary is the total of these amounts.',
    },
    {
      id: 'gross-profit',
      title: 'Gross profit',
      body: 'Sales amount minus the cost of stock that left the bar, including waste and comps. Waiters do not see this card.',
    },
    {
      id: 'pos',
      title: 'POS',
      body: 'Quantity rung on checks opened at this bar on the selected day. It is shown beside the count so you can compare the two. It does not replace Sales.',
    },
    {
      id: 'variance',
      title: 'Variance',
      body: 'Sales minus POS. A positive number means the count says more left the bar than was rung on checks.',
    },
    {
      id: 'finalize',
      title: 'Finalize',
      body: 'Finalize today when the count is done. The next person linked to this bar continues from that close. If yesterday is still open, close it here before the next person can start a shift or sell. Today’s sheet does not open from an unfinalized close.',
    },
  ],
  'stock-requests':
    'Waiters submit replenishment lines for a bar. Store staff Approve to issue stock to that bar (store quantity down, bar Received up) or Reject. Pending requests also appear on the bar hub.',
  'user-stock-logs': [
    {
      id: 'sheet',
      title: 'This list',
      body: 'Each bar’s daily stock sheet for the selected date. The bar and the staff on duty are named above that day’s drinks. Filter by bar, the person on duty, or date.',
    },
    {
      id: 'opening-value',
      title: 'Opening stock value',
      body: 'Opening bottles times each drink’s selling price, for the logs in the current list.',
    },
    {
      id: 'sales-value',
      title: 'Total sales value',
      body: 'The sales amount already stored on this day’s logs: stock that disappeared, after waste and comps, times the selling price.',
    },
    {
      id: 'stock-left',
      title: 'Stock left value',
      body: 'Closing bottles times each drink’s selling price.',
    },
    {
      id: 'edit',
      title: 'Edit, finalize, and delete',
      body: 'Those actions stay on the left while the drink columns scroll. Use + to add a drink to a bar. Opening comes from that bar’s last finalized close. Finalize all closes every open log in the current list.',
    },
    {
      id: 'reopen',
      title: 'Reopen and new stock received',
      body: 'Both are included in Food & Beverage FULL. Reopen makes a finalized bar day editable again. New stock received can then be set on the drink. That correction does not change the central store. Staff cannot change a reopened day from My stock.',
    },
  ],
  'store-inventory': [
    {
      id: 'opening-value',
      title: 'Opening stock value',
      body: 'Bottles on hand before today’s receipts, issues, and count adjustments, priced at bottle cost for the whole store.',
    },
    {
      id: 'issued-today',
      title: 'Issued today',
      body: 'The bottle-cost value of stock sent from the store to bars today.',
    },
    {
      id: 'on-hand',
      title: 'Stock on hand',
      body: 'Bottles in the store now, times bottle cost.',
    },
    {
      id: 'add',
      title: 'Add a row',
      body: 'Use + and enter the crates on hand, the price of one crate, bottles per crate, and supply costs such as transportation. Bottle cost is the crate total plus those costs, divided by the bottles. A manual unit cost on the beverage overrides it for bar profit.',
    },
    {
      id: 'changes',
      title: 'Later changes',
      body: 'Quantity changes go through Store transactions or a posted Store count. Inventory FULL can set the bottles on hand from edit and records a count adjustment for the difference. That does not change stock already at a bar. Filter by category, stock status, or unit, and search by beverage.',
    },
  ],
  'store-transactions': [
    {
      id: 'receive',
      title: 'Receive',
      body: 'A crate purchase: number of crates, price per crate, bottles per crate, and supply costs such as transportation. The store adds the bottles. Bottle cost is that landed total divided by the bottles.',
    },
    {
      id: 'issue',
      title: 'Issue',
      body: 'Removes bottles from the store and posts them to the chosen bar for today.',
    },
    {
      id: 'count',
      title: 'Count adjustments',
      body: 'These appear after a posted store count. Transactions are dated today in the property timezone.',
    },
  ],
  'store-count':
    'Physical count of the central bar store. Start a draft to snapshot book quantity, enter counted amounts, Save, then Post. Posting sets on-hand to the counted quantity and records the difference as count adjustments. It does not change stock already at a bar.',
};

export function BarManagementPageGuide({ page }: { page: GuidePage }) {
  const guide = GUIDES[page];
  if (typeof guide === 'string') {
    return <PageGuide text={guide} />;
  }
  return <PageGuide guideId={page === 'hub' ? BAR_HUB_GUIDE_ID : `bar-${page}`} sections={guide} />;
}
