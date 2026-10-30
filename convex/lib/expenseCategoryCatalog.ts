export const EXPENSE_CATEGORIES = [
  "utilities",
  "supplies",
  "staff",
  "maintenance",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const SYSTEM_EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: "utilities", label: "Billing" },
  { key: "supplies", label: "Inventory" },
  { key: "staff", label: "Payroll" },
  { key: "maintenance", label: "Maintenance" },
  { key: "other", label: "Other" },
];

const SYSTEM_KEYS = new Set<string>(EXPENSE_CATEGORIES);

export function isSystemExpenseCategory(value: string): value is ExpenseCategory {
  return SYSTEM_KEYS.has(value);
}

export function systemExpenseLabel(value: string) {
  return SYSTEM_EXPENSE_CATEGORIES.find((item) => item.key === value)?.label ?? value;
}
