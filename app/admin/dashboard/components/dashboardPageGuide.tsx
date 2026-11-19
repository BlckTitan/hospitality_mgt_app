'use client';

import { PageGuide } from '../../../../shared/pageGuide';

const DESCRIPTION =
  'P&L / RevPAR is this property’s result for the day, week, month, or year you pick. Occupancy is overnight nights sold divided by nights you could have sold. Rooms out of order or in maintenance are left out, and a short stay is not a sold night. Available nights use rooms that are sellable now, so a room taken out of service today is left out of earlier dates too. ADR is the average price of a sold night. RevPAR is room revenue per available night — empty rooms and low rates both pull it down even when ADR looks fine. TRevPAR adds short stays, beverages, and the restaurant, so a wide gap above RevPAR means the outlets are carrying the property. GOP is revenue minus expenses, and GOPPAR is that profit per available night. Both turn red when the period lost money. GOP margin is profit as a share of revenue. Labor cost is payroll dated in the period as a share of revenue; watch it when it rises and sales do not. The weekday charts name the strongest day for rooms, bar, and food. A weekday that stays weak is where to look at price, staffing, or promotion. Elsewhere, red means act now: overdue housekeeping, low stock, beverage reorder alerts, and overdue bills. Also watch waste and comps, bar stock sheets still open, and a high restaurant food-cost share. The amber list is maintenance coming due.';

export function DashboardPageGuide() {
  return <PageGuide text={DESCRIPTION} />;
}
