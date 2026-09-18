'use client'

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from '../../shift/components/validation';
import {
  PunctualityPeriod,
  PunctualityPeriodToggle,
  PunctualitySummaryCards,
  punctualityDateRange,
} from './punctualityReport';

export default function Punctuality({ propertyId }: { propertyId: string }) {
  const [period, setPeriod] = useState<PunctualityPeriod>('month');
  const [department, setDepartment] = useState('');
  const range = useMemo(() => punctualityDateRange(period), [period]);
  const response = useQuery(api.punctuality.listPropertySummary, {
    propertyId: propertyId as Id<'properties'>,
    fromDate: range.fromDate,
    toDate: range.toDate,
    department: department || undefined,
  });

  const teamSummary = useMemo(() => {
    const rows = response?.success === true ? response.data : [];
    const daysWorked = rows.reduce((sum, row) => sum + row.summary.daysWorked, 0);
    const daysOnTime = rows.reduce((sum, row) => sum + row.summary.daysOnTime, 0);
    const daysLate = rows.reduce((sum, row) => sum + row.summary.daysLate, 0);
    const daysUnscheduled = rows.reduce((sum, row) => sum + row.summary.daysUnscheduled, 0);
    const scored = daysOnTime + daysLate;
    const weightedLate = rows.reduce((sum, row) => {
      const scoredDays = row.summary.daysOnTime + row.summary.daysLate;
      if (!scoredDays || row.summary.averageMinutesLate == null) return sum;
      return sum + row.summary.averageMinutesLate * scoredDays;
    }, 0);
    return {
      daysWorked,
      daysOnTime,
      daysLate,
      daysUnscheduled,
      onTimePercent: scored === 0 ? null : Math.round((daysOnTime / scored) * 1000) / 10,
      averageMinutesLate: scored === 0 ? null : Math.round((weightedLate / scored) * 10) / 10,
    };
  }, [response]);

  return (
    <div>
      <PunctualityPeriodToggle period={period} onChange={setPeriod} />
      <label className="block text-sm mb-3">
        Department
        <select
          className="border rounded p-2 ml-2"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">All</option>
          {SHIFT_DEPARTMENTS.map((item) => (
            <option key={item} value={item}>{DEPARTMENT_LABELS[item]}</option>
          ))}
        </select>
      </label>
      <p className="text-sm text-slate-600 mb-2">
        {range.fromDate} to {range.toDate}
        {response?.graceMinutes != null ? ` · ${response.graceMinutes} minute grace` : ''}
      </p>
      {response === undefined && <p>Loading...</p>}
      {response?.success === false && <p className="text-red-600">{response.message}</p>}
      {response?.success === true && (
        <>
          <PunctualitySummaryCards summary={teamSummary} />
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 text-left">Staff</th>
                <th className="p-2 text-left">Department</th>
                <th className="p-2 text-left">Days</th>
                <th className="p-2 text-left">On time</th>
                <th className="p-2 text-left">Late</th>
                <th className="p-2 text-left">On-time %</th>
                <th className="p-2 text-left">Avg min late</th>
              </tr>
            </thead>
            <tbody>
              {response.data.map((row) => (
                <tr key={row.staffId} className="border-t">
                  <td className="p-2">
                    <Link className="!text-blue-700" href={`/admin/staff/view?staff_id=${row.staffId}`}>
                      {row.staffName}
                    </Link>
                  </td>
                  <td className="p-2">
                    {row.department && row.department in DEPARTMENT_LABELS
                      ? DEPARTMENT_LABELS[row.department as keyof typeof DEPARTMENT_LABELS]
                      : row.department || '—'}
                  </td>
                  <td className="p-2">{row.summary.daysWorked}</td>
                  <td className="p-2">{row.summary.daysOnTime}</td>
                  <td className="p-2">{row.summary.daysLate}</td>
                  <td className="p-2">{row.summary.onTimePercent == null ? '—' : `${row.summary.onTimePercent}%`}</td>
                  <td className="p-2">{row.summary.averageMinutesLate ?? '—'}</td>
                </tr>
              ))}
              {response.data.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={7}>No started shifts in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
