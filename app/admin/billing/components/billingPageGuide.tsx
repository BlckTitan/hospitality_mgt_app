'use client';

import { PageGuide } from '../../../../shared/pageGuide';

type GuidePage = 'hub' | 'accounts' | 'accounts-edit' | 'bills' | 'expenses' | 'expense-categories';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Track this property’s utility and subscription bills (electricity, water, internet, and similar). Create Bill accounts first. Periods open automatically for the current week, month, or year. Capture the amount and original bill, then Mark paid — that posts a paid expense. Overdue and due this week are listed below.',
  accounts:
    'Create a bill account with + for each utility or subscription this property pays. Set type, frequency (weekly, monthly, or annually), a billing cycle date, and provider. The cycle date is the day the bill is due in each period. Leave it blank to use the end of the week, month, or year. Active accounts get a period for the current cycle. Open period if one is missing.',
  'accounts-edit':
    'Change this account’s name, type, cadence, billing cycle date, provider, or active status. Saving a new cycle date updates the due date of the current unpaid bill. Existing paid bills are not rewritten. Saving an active account opens the current period if it is missing.',
  bills:
    'Capture the amount, due date, and optional invoice number when the bill arrives, and attach the original bill PDF. Mark paid records the full amount as a paid expense. You cannot pay until a bill document is attached. Paid rows cannot be recaptured.',
  expenses:
    'Expense Tracker lists cash outflows by source: billing, payroll, maintenance, inventory, and other. Filter by day, week, month, or year. The pie chart shows how spend is split by category; the line chart shows how each category changes over time. Record expense is for one-off paid costs that do not already have a bill, payroll run, work order, or purchase order. Add a missing category from Categories.',
  'expense-categories':
    'Built-in categories are Billing, Inventory, Payroll, Maintenance, and Other. Use + to add a category for this property, such as Marketing. Deactivate a custom category to hide it from new expenses. Expenses already recorded keep that category.',
};

export function BillingPageGuide({ page }: { page: GuidePage }) {
  return <PageGuide text={DESCRIPTIONS[page]} />;
}
