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
