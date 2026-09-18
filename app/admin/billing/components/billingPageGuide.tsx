'use client';

type GuidePage = 'hub' | 'accounts' | 'accounts-edit' | 'bills' | 'expenses';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Track this property’s utility and subscription bills (electricity, water, internet, and similar). Create Bill accounts first. Periods open automatically for the current week, month, or year. Capture the amount and original bill, then Mark paid — that posts a paid expense. Overdue and due this week are listed below.',
  accounts:
    'Create a bill account with + for each utility or subscription this property pays. Set type, frequency (weekly, monthly, or annually), and provider. Active accounts get a period for the current cycle. Open period if one is missing. Edit an account to change provider, cadence, or deactivate it.',
  'accounts-edit':
    'Change this account’s name, type, cadence, provider, or active status. Existing paid bills are not rewritten. Saving an active account opens the current period if it is missing.',
  bills:
    'Capture the amount (and optional invoice number) when the bill arrives, and attach the original bill PDF. Mark paid records the full amount as a paid expense. You cannot pay until a bill document is attached. Paid rows cannot be recaptured.',
  expenses:
    'Cash outflows for this property: bills, payroll, maintenance, inventory purchases, and other operating spend. Filter by day, week, month, or year. Record expense is for one-off paid costs that do not already have a bill, payroll run, work order, or purchase order.',
};

export function BillingPageGuide({ page }: { page: GuidePage }) {
  return <p className="mb-4 text-sm text-gray-600">{DESCRIPTIONS[page]}</p>;
}
