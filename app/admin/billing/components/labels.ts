export const BILL_TYPE_OPTIONS = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet' },
  { value: 'cable', label: 'Cable / TV' },
  { value: 'waste', label: 'Waste' },
  { value: 'local_government', label: 'Local government' },
  { value: 'other', label: 'Other' },
];

export const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'check', label: 'Check' },
];

export function billTypeLabel(value: string) {
  return BILL_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function frequencyLabel(value: string) {
  return FREQUENCY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString();
}

export function formatMoney(amount: number | undefined) {
  if (amount === undefined) return '—';
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
