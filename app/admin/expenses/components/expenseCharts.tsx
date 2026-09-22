'use client';

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { formatMoney } from '../../billing/components/labels';
import {
  cashPeriodBounds,
  type CashPeriodKind,
} from '../../../../lib/cashPeriod';
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_OPTIONS,
} from './categoryLabels';

ChartJS.register(
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const DAY_MS = 24 * 60 * 60 * 1000;

type ExpenseTotals = {
  utilities?: number;
  supplies?: number;
  staff?: number;
  maintenance?: number;
  other?: number;
  total?: number;
};

function seriesWindow(anchor: number, kind: CashPeriodKind, timeZone: string) {
  const range = cashPeriodBounds(anchor, kind, timeZone);
  if (kind === 'day') {
    return { start: range.end - 14 * DAY_MS, end: range.end, grain: 'day' as const };
  }
  if (kind === 'year') {
    return { ...range, grain: 'month' as const };
  }
  return { ...range, grain: 'day' as const };
}

function bucketLabel(start: number, grain: 'day' | 'week' | 'month') {
  const date = new Date(start);
  if (grain === 'month') {
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  if (grain === 'week') {
    const end = new Date(start + 6 * DAY_MS);
    return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function trendCaption(kind: CashPeriodKind, periodLabel: string) {
  if (kind === 'day') return 'Daily spend by category for the last 14 days';
  if (kind === 'week') return `Daily spend by category for ${periodLabel}`;
  if (kind === 'month') return `Daily spend by category for ${periodLabel}`;
  return `Monthly spend by category for ${periodLabel}`;
}

export function ExpenseCharts({
  propertyId,
  kind,
  anchor,
  timeZone,
  periodLabel,
  totals,
}: {
  propertyId: Id<'properties'>;
  kind: CashPeriodKind;
  anchor: number;
  timeZone: string;
  periodLabel: string;
  totals: ExpenseTotals | undefined;
}) {
  const window = useMemo(() => seriesWindow(anchor, kind, timeZone), [anchor, kind, timeZone]);
  const series = useQuery(api.expenses.seriesExpensesByCategory, {
    propertyId,
    start: window.start,
    end: window.end,
    grain: window.grain,
  });

  const pieSlices = EXPENSE_CATEGORY_OPTIONS.filter((item) => (totals?.[item.value] ?? 0) > 0);
  const pieTotal = totals?.total ?? 0;
  const pieData =
    pieSlices.length > 0
      ? {
          labels: pieSlices.map((item) => item.label),
          datasets: [
            {
              data: pieSlices.map((item) => totals?.[item.value] ?? 0),
              backgroundColor: pieSlices.map((item) => EXPENSE_CATEGORY_COLORS[item.value].fill),
              borderColor: pieSlices.map((item) => EXPENSE_CATEGORY_COLORS[item.value].stroke),
              borderWidth: 1,
            },
          ],
        }
      : null;

  const lineData =
    series?.success && series.data
      ? {
          labels: series.data.map((point) => bucketLabel(point.start, window.grain)),
          datasets: EXPENSE_CATEGORY_OPTIONS.map((item) => ({
            label: item.label,
            data: series.data.map((point) => point[item.value]),
            borderColor: EXPENSE_CATEGORY_COLORS[item.value].stroke,
            backgroundColor: EXPENSE_CATEGORY_COLORS[item.value].fill,
            tension: 0.3,
            fill: false,
          })),
        }
      : null;

  const moneyTick = (value: string | number) =>
    formatMoney(typeof value === 'number' ? value : Number(value));

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4'>
      <div className='border p-4'>
        <h4 className='text-sm font-semibold mb-1'>Category volume</h4>
        <p className='text-xs text-gray-500 mb-3'>Share of spend by category for {periodLabel}</p>
        <div className='h-72'>
          {totals === undefined ? (
            <p className='h-full flex items-center justify-center text-gray-500'>Loading category mix…</p>
          ) : pieData ? (
            <Pie
              data={pieData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const amount = Number(ctx.raw) || 0;
                        const percent = pieTotal ? Math.round((amount / pieTotal) * 100) : 0;
                        return `${ctx.label}: ${formatMoney(amount)} (${percent}%)`;
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            <p className='h-full flex items-center justify-center text-gray-500'>
              No spend in this period
            </p>
          )}
        </div>
      </div>

      <div className='border p-4'>
        <h4 className='text-sm font-semibold mb-1'>Spend over time</h4>
        <p className='text-xs text-gray-500 mb-3'>{trendCaption(kind, periodLabel)}</p>
        <div className='h-72'>
          {series === undefined ? (
            <p className='h-full flex items-center justify-center text-gray-500'>Loading trend…</p>
          ) : lineData ? (
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.parsed.y) || 0)}`,
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { callback: moneyTick },
                  },
                },
              }}
            />
          ) : (
            <p className='h-full flex items-center justify-center text-gray-500'>No trend data</p>
          )}
        </div>
      </div>
    </div>
  );
}
