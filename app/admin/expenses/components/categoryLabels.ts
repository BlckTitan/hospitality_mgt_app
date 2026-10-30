import { SYSTEM_EXPENSE_CATEGORIES } from '../../../../convex/lib/expenseCategoryCatalog';

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SYSTEM_EXPENSE_CATEGORIES.map((item) => [item.key, item.label]),
);

export const EXPENSE_CATEGORY_OPTIONS = SYSTEM_EXPENSE_CATEGORIES.map((item) => ({
  value: item.key,
  label: item.label,
}));

export const EXPENSE_CATEGORY_COLORS: Record<string, { fill: string; stroke: string }> = {
  utilities: { fill: 'rgba(59, 130, 246, 0.7)', stroke: 'rgba(59, 130, 246, 1)' },
  supplies: { fill: 'rgba(251, 146, 60, 0.7)', stroke: 'rgba(251, 146, 60, 1)' },
  staff: { fill: 'rgba(139, 92, 246, 0.7)', stroke: 'rgba(139, 92, 246, 1)' },
  maintenance: { fill: 'rgba(16, 185, 129, 0.7)', stroke: 'rgba(16, 185, 129, 1)' },
  other: { fill: 'rgba(107, 114, 128, 0.7)', stroke: 'rgba(107, 114, 128, 1)' },
};

const EXTRA_CATEGORY_COLORS = [
  { fill: 'rgba(236, 72, 153, 0.7)', stroke: 'rgba(236, 72, 153, 1)' },
  { fill: 'rgba(14, 165, 233, 0.7)', stroke: 'rgba(14, 165, 233, 1)' },
  { fill: 'rgba(234, 179, 8, 0.7)', stroke: 'rgba(234, 179, 8, 1)' },
  { fill: 'rgba(244, 63, 94, 0.7)', stroke: 'rgba(244, 63, 94, 1)' },
  { fill: 'rgba(20, 184, 166, 0.7)', stroke: 'rgba(20, 184, 166, 1)' },
];

export function expenseCategoryColor(key: string, index = 0) {
  return EXPENSE_CATEGORY_COLORS[key] ?? EXTRA_CATEGORY_COLORS[index % EXTRA_CATEGORY_COLORS.length];
}
