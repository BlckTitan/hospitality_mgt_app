'use client';

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { formatPropertyMoney } from '../../inventory-management/components/money';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type DayBucket = {
  day: string;
  occupancyRate: number;
  barQty: number;
  foodSales: number;
};

function DayBarChart({
  title,
  peakLabel,
  labels,
  values,
  color,
  yTitle,
  formatValue,
  emptyMessage,
}: {
  title: string;
  peakLabel?: string | null;
  labels: string[];
  values: number[];
  color: string;
  yTitle: string;
  formatValue: (value: number) => string;
  emptyMessage: string;
}) {
  const hasData = values.some((v) => v > 0);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: title,
          data: values,
          backgroundColor: color,
        },
      ],
    }),
    [color, labels, title, values],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { parsed: { y: number | null } }) =>
              formatValue(ctx.parsed.y ?? 0),
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Day of week' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: yTitle },
          ticks: {
            callback: (value: string | number) => formatValue(Number(value)),
          },
        },
      },
    }),
    [formatValue, yTitle],
  );

  return (
    <div className="border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h4 className="font-semibold">{title}</h4>
        {peakLabel && <p className="text-sm text-slate-700">{peakLabel}</p>}
      </div>
      {hasData ? (
        <div className="h-56 w-full">
          <Bar data={chartData} options={options} />
        </div>
      ) : (
        <p className="text-sm text-slate-600">{emptyMessage}</p>
      )}
    </div>
  );
}

export function SalesByDayChart({
  propertyId,
  start,
  end,
  currency,
}: {
  propertyId: Id<'properties'>;
  start: number;
  end: number;
  currency?: string;
}) {
  const result = useQuery(api.dashboard.getSalesByDayOfWeek, {
    propertyId,
    start,
    end,
  });

  const money = (value: number) => formatPropertyMoney(value, currency);
  const pct = (value: number) => `${value.toFixed(1)}%`;
  const qty = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

  if (result === undefined) {
    return (
      <div className="mt-6 border p-4">
        <h4 className="font-semibold mb-2">Performance by day of week</h4>
        <p className="text-sm text-slate-600">Loading charts…</p>
      </div>
    );
  }

  const data = result.data;
  if (!data) {
    return null;
  }

  const days: DayBucket[] = data.days;
  const labels = days.map((d) => d.day);

  return (
    <div className="mt-6">
      <div className="mb-4">
        <h4 className="font-semibold">Performance by day of week</h4>
        <p className="text-sm text-slate-600">
          Which weekdays perform best for rooms, bar, and food in the selected period.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <DayBarChart
          title="Rooms — occupancy rate"
          peakLabel={
            data.peakOccupancyDay
              ? `Strongest day: ${data.peakOccupancyDay} · ${pct(data.peakOccupancyRate)}`
              : null
          }
          labels={labels}
          values={days.map((d) => d.occupancyRate)}
          color="rgba(30, 64, 175, 0.85)"
          yTitle="Occupancy %"
          formatValue={pct}
          emptyMessage="No room nights sold in this period yet."
        />

        <DayBarChart
          title="Bar — items sold"
          peakLabel={
            data.peakBarQtyDay
              ? `Strongest day: ${data.peakBarQtyDay} · ${qty(data.peakBarQty)} items`
              : null
          }
          labels={labels}
          values={days.map((d) => d.barQty)}
          color="rgba(180, 83, 9, 0.85)"
          yTitle="Quantity sold"
          formatValue={qty}
          emptyMessage="No bar items sold in this period yet."
        />

        <DayBarChart
          title="Food — sales"
          peakLabel={
            data.peakFoodSalesDay
              ? `Strongest day: ${data.peakFoodSalesDay} · ${money(data.peakFoodSales)}`
              : null
          }
          labels={labels}
          values={days.map((d) => d.foodSales)}
          color="rgba(22, 101, 52, 0.85)"
          yTitle="Sales"
          formatValue={money}
          emptyMessage="No food sales in this period yet."
        />
      </div>
    </div>
  );
}
