'use client';

import { useQuery } from 'convex/react';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { formatPropertyMoney } from '../../inventory-management/components/money';
import { billTypeLabel, frequencyLabel } from './labels';

ChartJS.register(ArcElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip);

const BILL_COLORS = [
  { fill: 'rgba(37, 99, 235, 0.75)', stroke: 'rgba(37, 99, 235, 1)' },
  { fill: 'rgba(14, 165, 233, 0.75)', stroke: 'rgba(14, 165, 233, 1)' },
  { fill: 'rgba(13, 148, 136, 0.75)', stroke: 'rgba(13, 148, 136, 1)' },
  { fill: 'rgba(22, 163, 74, 0.75)', stroke: 'rgba(22, 163, 74, 1)' },
  { fill: 'rgba(202, 138, 4, 0.75)', stroke: 'rgba(202, 138, 4, 1)' },
  { fill: 'rgba(234, 88, 12, 0.75)', stroke: 'rgba(234, 88, 12, 1)' },
  { fill: 'rgba(220, 38, 38, 0.75)', stroke: 'rgba(220, 38, 38, 1)' },
  { fill: 'rgba(147, 51, 234, 0.75)', stroke: 'rgba(147, 51, 234, 1)' },
  { fill: 'rgba(79, 70, 229, 0.75)', stroke: 'rgba(79, 70, 229, 1)' },
  { fill: 'rgba(100, 116, 139, 0.75)', stroke: 'rgba(100, 116, 139, 1)' },
];

function periodLabel(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

function colorFor(name: string, names: string[]) {
  const index = Math.max(0, names.indexOf(name));
  return BILL_COLORS[index % BILL_COLORS.length];
}

export function BillingCharts({
  propertyId,
  currency,
}: {
  propertyId: Id<'properties'>;
  currency?: string;
}) {
  const charts = useQuery(api.billing.getBillingCharts, { propertyId });
  const money = (value: number) => formatPropertyMoney(value, currency);

  const quota = charts?.data.quota ?? [];
  const series = charts?.data.series ?? [];
  const colorNames = [...new Set([...quota.map((row) => row.name), ...series.map((row) => row.name)])].sort(
    (a, b) => a.localeCompare(b),
  );
  const pieTotal = quota.reduce((sum, row) => sum + row.annualized, 0);
  const pieData =
    quota.length > 0
      ? {
          labels: quota.map((row) => row.name),
          datasets: [
            {
              data: quota.map((row) => row.annualized),
              backgroundColor: quota.map((row) => colorFor(row.name, colorNames).fill),
              borderColor: quota.map((row) => colorFor(row.name, colorNames).stroke),
              borderWidth: 1,
            },
          ],
        }
      : null;

  const labels = [...new Set(series.flatMap((row) => row.points.map((point) => point.periodStart)))].sort(
    (a, b) => a - b,
  );
  const lineData =
    series.length > 0
      ? {
          labels: labels.map(periodLabel),
          datasets: series.map((row) => {
            const byStart = new Map(row.points.map((point) => [point.periodStart, point]));
            const color = colorFor(row.name, colorNames);
            return {
              label: row.name,
              data: labels.map((start) => byStart.get(start)?.amount ?? null),
              unitRates: labels.map((start) => byStart.get(start)?.unitRate ?? null),
              borderColor: color.stroke,
              backgroundColor: color.fill,
              tension: 0.25,
              spanGaps: false,
            };
          }),
        }
      : null;

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4'>
      <div className='border p-4'>
        <h4 className='text-sm font-semibold mb-1'>Quota of each bill</h4>
        <p className='text-xs text-gray-500 mb-3'>
          Share of annual cost. Weekly amounts are multiplied by 52 and monthly amounts by 12. Each slice uses the latest captured amount, or the expected amount when none is captured.
        </p>
        <div className='h-72'>
          {charts === undefined ? (
            <p className='h-full flex items-center justify-center text-gray-500'>Loading bill quota…</p>
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
                        const row = quota[ctx.dataIndex];
                        if (!row) return '';
                        const percent = pieTotal ? Math.round((row.annualized / pieTotal) * 100) : 0;
                        const basis = row.source === 'captured' ? 'Latest' : 'Expected';
                        return [
                          `${row.name}: ${money(row.annualized)} / year (${percent}%)`,
                          `${basis} ${frequencyLabel(row.frequency).toLowerCase()} bill ${money(row.amount)} · ${billTypeLabel(row.billType)}`,
                        ];
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            <p className='h-full flex items-center justify-center text-gray-500 text-center px-4'>
              Set an expected amount or capture a bill to see each account’s share.
            </p>
          )}
        </div>
      </div>

      <div className='border p-4'>
        <h4 className='text-sm font-semibold mb-1'>Price over time</h4>
        <p className='text-xs text-gray-500 mb-3'>
          Captured amount of each bill by period. The tooltip includes the unit rate when one was recorded.
        </p>
        <div className='h-72'>
          {charts === undefined ? (
            <p className='h-full flex items-center justify-center text-gray-500'>Loading price history…</p>
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
                      label: (ctx) => {
                        const amount = ctx.parsed.y;
                        if (amount == null) return '';
                        const unitRates = (ctx.dataset as { unitRates?: Array<number | null> }).unitRates;
                        const unitRate = unitRates?.[ctx.dataIndex];
                        const lines = [`${ctx.dataset.label}: ${money(amount)}`];
                        if (unitRate != null) lines.push(`Unit rate ${money(unitRate)}`);
                        return lines;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
                  },
                  y: {
                    ticks: {
                      callback: (value) => money(typeof value === 'number' ? value : Number(value)),
                    },
                  },
                },
              }}
            />
          ) : (
            <p className='h-full flex items-center justify-center text-gray-500 text-center px-4'>
              Capture a bill amount to see how prices change.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
