export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  utilities: 'Billing',
  supplies: 'Inventory',
  staff: 'Payroll',
  maintenance: 'Maintenance',
  other: 'Other',
};

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'utilities', label: 'Billing' },
  { value: 'supplies', label: 'Inventory' },
  { value: 'staff', label: 'Payroll' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
] as const;

export const EXPENSE_CATEGORY_COLORS: Record<
  (typeof EXPENSE_CATEGORY_OPTIONS)[number]['value'],
  { fill: string; stroke: string }
> = {
  utilities: { fill: 'rgba(59, 130, 246, 0.7)', stroke: 'rgba(59, 130, 246, 1)' },
  supplies: { fill: 'rgba(251, 146, 60, 0.7)', stroke: 'rgba(251, 146, 60, 1)' },
  staff: { fill: 'rgba(139, 92, 246, 0.7)', stroke: 'rgba(139, 92, 246, 1)' },
  maintenance: { fill: 'rgba(16, 185, 129, 0.7)', stroke: 'rgba(16, 185, 129, 1)' },
  other: { fill: 'rgba(107, 114, 128, 0.7)', stroke: 'rgba(107, 114, 128, 1)' },
};
