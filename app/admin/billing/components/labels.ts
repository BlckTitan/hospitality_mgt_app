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

export function formatUtcDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { timeZone: 'UTC' });
}

export function dateInputToUtcTimestamp(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }
  return timestamp;
}

export function utcTimestampToDateInput(value?: number) {
  if (!value) return '';
  const date = new Date(value);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function dateToUtcTimestamp(value?: Date | null) {
  if (!value || Number.isNaN(value.getTime())) return undefined;
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return dateInputToUtcTimestamp(`${value.getFullYear()}-${month}-${day}`);
}

export function utcTimestampToDate(value?: number): Date | null {
  const input = utcTimestampToDateInput(value);
  if (!input) return null;
  const [year, month, day] = input.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function cycleDateHint(frequency: string) {
  if (frequency === 'weekly') {
    return 'Bills are due on this weekday each week. Leave blank to use the end of the week.';
  }
  if (frequency === 'annually') {
    return 'Bills are due on this month and day each year. Leave blank to use the end of the year.';
  }
  return 'Bills are due on this day each month. Shorter months use the last day. Leave blank to use the end of the month.';
}

export function formatMoney(amount: number | undefined) {
  if (amount === undefined) return '—';
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
