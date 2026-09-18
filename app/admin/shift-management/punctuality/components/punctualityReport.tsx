'use client'

import type { ReactNode } from 'react';
import { Button } from 'react-bootstrap';

export type PunctualityPeriod = 'week' | 'month';

export type PunctualityStatus = 'on_time' | 'late' | 'unscheduled';

export type PunctualityDayRow = {
  shiftId: string;
  shiftDate: string;
  expectedStart?: string;
  clockStartLocal: string;
  minutesLate: number;
  punctualityStatus: PunctualityStatus;
};

export type PunctualitySummaryRow = {
  daysWorked: number;
  daysOnTime: number;
  daysLate: number;
  daysUnscheduled: number;
  onTimePercent: number | null;
  averageMinutesLate: number | null;
};

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function punctualityDateRange(period: PunctualityPeriod, now = new Date()) {
  if (period === 'month') {
    return {
      fromDate: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      toDate: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  const daysFromMonday = (now.getDay() + 6) % 7;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { fromDate: isoDate(from), toDate: isoDate(to) };
}

export function PunctualityStatusLabel({
  status,
  minutesLate,
}: {
  status?: PunctualityStatus | null;
  minutesLate?: number | null;
}) {
  if (!status) return <span>—</span>;
  if (status === 'late') {
    return (
      <span className="text-amber-800">
        Late{minutesLate != null ? ` · ${minutesLate} min` : ''}
      </span>
    );
  }
  if (status === 'unscheduled') return <span className="text-slate-600">Unscheduled</span>;
  return <span className="text-green-700">On time</span>;
}

export function PunctualityPeriodToggle({
  period,
  onChange,
}: {
  period: PunctualityPeriod;
  onChange: (period: PunctualityPeriod) => void;
}) {
  return (
    <div className="flex gap-2 mb-3">
      <Button size="sm" variant={period === 'week' ? 'dark' : 'outline-secondary'} onClick={() => onChange('week')}>
        This week
      </Button>
      <Button size="sm" variant={period === 'month' ? 'dark' : 'outline-secondary'} onClick={() => onChange('month')}>
        This month
      </Button>
    </div>
  );
}

export function PunctualitySummaryCards({ summary }: { summary: PunctualitySummaryRow }) {
  const cell = (label: string, value: ReactNode) => (
    <div className="border rounded p-2 min-w-28">
      <p className="text-xs text-slate-500 mb-0">{label}</p>
      <p className="font-semibold mb-0">{value}</p>
    </div>
  );
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {cell('Days worked', summary.daysWorked)}
      {cell('On time', summary.daysOnTime)}
      {cell('Late', summary.daysLate)}
      {cell('On-time %', summary.onTimePercent == null ? '—' : `${summary.onTimePercent}%`)}
      {cell('Avg minutes late', summary.averageMinutesLate == null ? '—' : summary.averageMinutesLate)}
    </div>
  );
}

export function PunctualityDaysTable({ days }: { days: PunctualityDayRow[] }) {
  return (
    <table className="w-full text-sm border">
      <thead>
        <tr className="bg-slate-50">
          <th className="p-2 text-left">Date</th>
          <th className="p-2 text-left">Expected</th>
          <th className="p-2 text-left">Started</th>
          <th className="p-2 text-left">Punctuality</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.shiftId} className="border-t">
            <td className="p-2">{day.shiftDate}</td>
            <td className="p-2">{day.expectedStart || '—'}</td>
            <td className="p-2">{day.clockStartLocal}</td>
            <td className="p-2">
              <PunctualityStatusLabel status={day.punctualityStatus} minutesLate={day.minutesLate} />
            </td>
          </tr>
        ))}
        {days.length === 0 && (
          <tr>
            <td className="p-2" colSpan={4}>No started shifts in this period.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
