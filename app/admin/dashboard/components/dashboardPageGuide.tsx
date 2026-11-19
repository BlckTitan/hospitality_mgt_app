'use client';

import { GuideSection, PageGuide } from '../../../../shared/pageGuide';

export const DASHBOARD_GUIDE_ID = 'dashboard';

const SECTIONS: GuideSection[] = [
  {
    id: 'period',
    title: 'P&L / RevPAR',
    body: 'These figures follow the day, week, month, or year you select for this property.',
  },
  {
    id: 'occupancy',
    title: 'Occupancy',
    body: 'Overnight nights sold divided by nights you could have sold. Rooms out of order or in maintenance are left out, and a short stay is not a sold night. Available nights use rooms that are sellable now, so a room taken out of service today is left out of earlier dates too.',
  },
  {
    id: 'adr',
    title: 'ADR',
    body: 'The average price of a sold night.',
  },
  {
    id: 'revpar',
    title: 'RevPAR',
    body: 'Room revenue per available night. Empty rooms and low rates both pull it down even when ADR looks fine.',
  },
  {
    id: 'trevpar',
    title: 'TRevPAR',
    body: 'RevPAR plus short stays, beverages, and the restaurant. A wide gap above RevPAR means the outlets are carrying the property.',
  },
  {
    id: 'gop',
    title: 'GOP',
    body: 'Revenue minus expenses. The number turns red when the period lost money.',
  },
  {
    id: 'goppar',
    title: 'GOPPAR',
    body: 'Gross operating profit per available night. It turns red when the period lost money.',
  },
  {
    id: 'gop-margin',
    title: 'GOP margin',
    body: 'Profit as a share of revenue.',
  },
  {
    id: 'labor',
    title: 'Labor cost',
    body: 'Payroll dated in the period as a share of revenue. Watch it when it rises and sales do not.',
  },
  {
    id: 'weekdays',
    title: 'Weekday charts',
    body: 'These name the strongest day for rooms, bar, and food. A weekday that stays weak is where to look at price, staffing, or promotion.',
  },
  {
    id: 'watch',
    title: 'What to act on',
    body: 'Red means act now: overdue housekeeping, low stock, beverage reorder alerts, and overdue bills. Also watch waste and comps, bar stock sheets still open, and a high restaurant food-cost share. The amber list is maintenance coming due.',
  },
];

export function DashboardPageGuide() {
  return <PageGuide guideId={DASHBOARD_GUIDE_ID} sections={SECTIONS} />;
}
