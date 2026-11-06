'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { formatPropertyMoney } from '../../inventory-management/components/money';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const LODGING_COLOR = '#0f172a';
const PRIOR_COLOR = '#94a3b8';
const COLLECTED_COLOR = '#0369a1';

const GRAINS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
] as const;

const TABS = [
  { id: 'shifts', label: 'Shift close' },
  { id: 'trends', label: 'Trends' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'days', label: 'Days' },
  { id: 'staff', label: 'Staff' },
] as const;

type Grain = (typeof GRAINS)[number]['id'];
type TabId = (typeof TABS)[number]['id'];

export function LodgingSummary({ propertyId }: { propertyId: Id<'properties'> }) {
  const [date, setDate] = useState('');
  const [grain, setGrain] = useState<Grain>('day');
  const [tab, setTab] = useState<TabId>('shifts');
  const summary = useQuery(api.lodgingSummary.getLodgingSummary, {
    propertyId,
    date: date || undefined,
    grain,
  });

  useEffect(() => {
    if (!date && summary?.success && summary.data) {
      setDate(summary.data.today);
    }
  }, [date, summary]);

  if (summary === undefined) {
    return (
      <section className="mb-8 rounded border p-3">
        <h2 className="text-base font-semibold text-slate-900">Lodging</h2>
        <p className="mt-1 text-sm text-slate-600">Loading lodging…</p>
      </section>
    );
  }
  if (!summary.success || !summary.data) {
    return (
      <section className="mb-8 rounded border p-3">
        <h2 className="text-base font-semibold text-slate-900">Lodging</h2>
        <p className="mt-1 text-sm text-red-600">{summary.message || 'Unable to load lodging.'}</p>
      </section>
    );
  }

  const data = summary.data;
  const money = (amount: number) => formatPropertyMoney(amount, data.currency);

  return (
    <section className="mb-8 rounded border">
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Lodging</h2>
          <p className="text-sm text-slate-600">
            {data.periodLabel}
            {data.capped ? ' · through today' : ''}
            {' · compared with '}
            {data.priorPeriodLabel}
            {' · '}
            {data.timeZone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-700">
            <span className="sr-only">Date</span>
            <input
              type="date"
              aria-label="Date"
              className="rounded border px-2 py-1.5 text-sm"
              value={date || data.anchor}
              max={data.today}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <div className="inline-flex overflow-hidden rounded border" role="group" aria-label="Period">
            {GRAINS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`px-3 py-1.5 text-sm ${
                  grain === item.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
                aria-pressed={grain === item.id}
                onClick={() => setGrain(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {data.truncated && (
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This period has more stays or payments than the summary can read at once. Totals may be short.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Lodging revenue" value={money(data.totals.lodgingRevenue)} note={formatYoy(data.totals.revenueYoy)} />
          <Stat label="Collected" value={money(data.totals.collected)} note={formatYoy(data.totals.collectedYoy)} />
          <Stat
            label="Occupancy"
            value={formatPct(data.totals.occupancyRate)}
            note={formatPoints(data.totals.occupancyYoyPoints)}
          />
          <Stat
            label="ADR"
            value={money(data.totals.adr)}
            note={`${data.totals.soldNights} sold nights · RevPAR ${money(data.totals.revpar)}`}
          />
        </div>
        <p className="text-xs text-slate-500">
          Room revenue {money(data.totals.roomRevenue)} · short stays {money(data.totals.shortStayRevenue)} · {data.totals.stays} stays
          {data.sellableRooms > 0 ? ` · ${data.sellableRooms} sellable rooms` : ''}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-t px-2" role="tablist" aria-label="Lodging detail">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm ${
              tab === item.id
                ? 'border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="p-3">
        {tab === 'shifts' && <ShiftClose data={data} money={money} />}
        {tab === 'trends' && <Trends data={data} money={money} />}
        {tab === 'rooms' && <Rooms data={data} money={money} />}
        {tab === 'days' && <Days data={data} money={money} />}
        {tab === 'staff' && <Staff data={data} money={money} />}
      </div>
    </section>
  );
}

type SummaryData = Extract<
  NonNullable<ReturnType<typeof useQuery<typeof api.lodgingSummary.getLodgingSummary>>>,
  { success: true }
>['data'];

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border rounded p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600 mt-1">{note}</p>
    </div>
  );
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatYoy(value: number | null) {
  if (value === null) return 'No comparison year';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}% vs last year`;
}

function formatPoints(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} pts vs last year`;
}

function yoyCell(value: number | null) {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function ShiftClose({ data, money }: { data: SummaryData; money: (amount: number) => string }) {
  const shifts = data.shifts;
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-slate-600">
        Finalized front-office shifts that ended on {data.anchor}. Booked value is the full price of stays they sold.
        Collected is reservation money they took. {shifts.closed.length} closed
        {shifts.closed.length === 1 ? '' : ' shifts'} · booked {money(shifts.bookingRevenue)} · collected {money(shifts.collected)}.
      </p>
      {shifts.openCount > 0 && (
        <p className="text-sm text-amber-800">
          {shifts.openCount} front-office {shifts.openCount === 1 ? 'shift is' : 'shifts are'} still open from this date or the
          previous three days, so {shifts.openCount === 1 ? 'it is' : 'they are'} not in this close.
        </p>
      )}
      {shifts.closed.length === 0 ? (
        <p className="text-sm text-slate-600">No front-office shift was closed on this date.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shifts.closed.map((shift) => (
            <article key={shift.shiftId} className="border rounded p-3 flex flex-col gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">{shift.staffName}</h2>
                <p className="text-xs text-slate-500">
                  {shift.shiftDate === data.anchor ? 'Started this date' : `Started ${shift.shiftDate}`}
                  {' · '}
                  {shift.startTime}
                  {shift.endTime ? `–${shift.endTime}` : ''}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Metric label="Booked" value={`${shift.bookings} · ${money(shift.bookingRevenue)}`} />
                <Metric label="Collected" value={money(shift.collected)} />
                <Metric label="Check-ins" value={String(shift.checkIns)} />
                <Metric label="Check-outs" value={String(shift.checkOuts)} />
              </dl>
              <p className="text-xs text-slate-500">
                {shift.overnightBookings} overnight · {shift.shortStayBookings} short
                {shift.collected > 0
                  ? ` · cash ${money(shift.cash)} · card ${money(shift.card)} · transfer ${money(shift.transfer)}`
                  : ''}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ChartPanel({
  title,
  note,
  height,
  children,
}: {
  title?: string;
  note?: string;
  height: number;
  children: ReactNode;
}) {
  return (
    <section>
      {title ? <h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3> : null}
      {note ? <p className="mb-2 text-sm text-slate-600">{note}</p> : null}
      <div className="w-full" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

function moneyTicks(money: (amount: number) => string) {
  return {
    beginAtZero: true,
    ticks: {
      callback: (value: string | number) => money(Number(value)),
    },
  };
}

function Trends({ data, money }: { data: SummaryData; money: (amount: number) => string }) {
  if (data.buckets.length === 0) {
    return <p className="text-sm text-slate-600">No days in this period.</p>;
  }
  return (
    <ChartPanel title="Lodging against last year" height={280}>
      <Line
        data={{
          labels: data.buckets.map((row) => row.label),
          datasets: [
            {
              label: 'Lodging',
              data: data.buckets.map((row) => row.lodgingRevenue),
              borderColor: LODGING_COLOR,
              backgroundColor: LODGING_COLOR,
              pointRadius: data.buckets.length > 1 ? 2 : 4,
              tension: 0.2,
            },
            {
              label: 'Last year',
              data: data.buckets.map((row) => row.priorLodgingRevenue),
              borderColor: PRIOR_COLOR,
              backgroundColor: PRIOR_COLOR,
              pointRadius: data.buckets.length > 1 ? 2 : 4,
              tension: 0.2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (item) => `${item.dataset.label}: ${money(item.parsed.y ?? 0)}`,
                afterBody: (items) => {
                  const row = data.buckets[items[0]?.dataIndex ?? -1];
                  if (!row) return [];
                  return [
                    `YoY ${yoyCell(row.revenueYoy)}`,
                    `Occupancy ${formatPct(row.occupancyRate)}`,
                    `ADR ${money(row.adr)}`,
                    `Collected ${money(row.collected)}`,
                  ];
                },
              },
            },
          },
          scales: {
            y: moneyTicks(money),
          },
        }}
      />
    </ChartPanel>
  );
}

function Rooms({ data, money }: { data: SummaryData; money: (amount: number) => string }) {
  const rooms = [...data.rooms].reverse();
  const types = [...data.roomTypes].reverse();
  return (
    <div className="flex flex-col gap-6">
      {rooms.length === 0 ? (
        <p className="text-sm text-slate-600">No stays in this period.</p>
      ) : (
        <ChartPanel title="Rooms by lodging revenue" height={Math.max(220, rooms.length * 36)}>
          <Bar
            data={{
              labels: rooms.map((row) => `Room ${row.roomNumber}`),
              datasets: [
                {
                  label: 'Lodging',
                  data: rooms.map((row) => row.revenue),
                  backgroundColor: LODGING_COLOR,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (item) => money(item.parsed.x ?? 0),
                    afterBody: (items) => {
                      const row = rooms[items[0]?.dataIndex ?? -1];
                      if (!row) return [];
                      return [
                        row.roomType,
                        `${row.stays} stays · ${row.nights} nights · ${row.shortStays} short`,
                      ];
                    },
                  },
                },
              },
              scales: {
                x: moneyTicks(money),
                y: { ticks: { autoSkip: false } },
              },
            }}
          />
        </ChartPanel>
      )}
      {types.length === 0 ? null : (
        <ChartPanel title="Room types by lodging revenue" height={Math.max(180, types.length * 36)}>
          <Bar
            data={{
              labels: types.map((row) => row.name),
              datasets: [
                {
                  label: 'Lodging',
                  data: types.map((row) => row.revenue),
                  backgroundColor: LODGING_COLOR,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (item) => money(item.parsed.x ?? 0),
                    afterBody: (items) => {
                      const row = types[items[0]?.dataIndex ?? -1];
                      if (!row) return [];
                      return [`${row.stays} stays · ${row.nights} nights · ${row.shortStays} short`];
                    },
                  },
                },
              },
              scales: {
                x: moneyTicks(money),
                y: { ticks: { autoSkip: false } },
              },
            }}
          />
        </ChartPanel>
      )}
    </div>
  );
}

function Days({ data, money }: { data: SummaryData; money: (amount: number) => string }) {
  const days = [...data.days].reverse();
  return (
    <div className="flex flex-col gap-6">
      {days.length === 0 ? (
        <p className="text-sm text-slate-600">No lodging revenue in this period.</p>
      ) : (
        <ChartPanel
          title="Best dates"
          note={`Ranked by lodging revenue in ${data.periodLabel}.${data.bestWeekday ? ` Best weekday on average: ${data.bestWeekday}.` : ''}`}
          height={Math.max(220, days.length * 36)}
        >
          <Bar
            data={{
              labels: days.map((row) => row.label),
              datasets: [
                {
                  label: 'Lodging',
                  data: days.map((row) => row.lodgingRevenue),
                  backgroundColor: LODGING_COLOR,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (item) => money(item.parsed.x ?? 0),
                    afterBody: (items) => {
                      const row = days[items[0]?.dataIndex ?? -1];
                      if (!row) return [];
                      return [
                        `Occupancy ${formatPct(row.occupancyRate)}`,
                        `${row.soldNights} sold nights`,
                        `Collected ${money(row.collected)}`,
                      ];
                    },
                  },
                },
              },
              scales: {
                x: moneyTicks(money),
                y: { ticks: { autoSkip: false } },
              },
            }}
          />
        </ChartPanel>
      )}
      {data.weekdays.length === 0 ? null : (
        <ChartPanel title="Weekday average" height={260}>
          <Bar
            data={{
              labels: data.weekdays.map((row) => row.day),
              datasets: [
                {
                  label: 'Average lodging',
                  data: data.weekdays.map((row) => row.averageRevenue),
                  backgroundColor: LODGING_COLOR,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (item) => money(item.parsed.y ?? 0),
                    afterBody: (items) => {
                      const row = data.weekdays[items[0]?.dataIndex ?? -1];
                      if (!row) return [];
                      return [
                        `Occupancy ${formatPct(row.occupancyRate)}`,
                        `${row.occurrences} ${row.occurrences === 1 ? 'time' : 'times'} in the period`,
                      ];
                    },
                  },
                },
              },
              scales: {
                y: moneyTicks(money),
              },
            }}
          />
        </ChartPanel>
      )}
    </div>
  );
}

function Staff({ data, money }: { data: SummaryData; money: (amount: number) => string }) {
  if (data.staff.length === 0) {
    return <p className="text-sm text-slate-600">No bookings, check-ins, or collections in this period.</p>;
  }
  const staff = [...data.staff].reverse();
  return (
    <ChartPanel
      note="Booked value is the full price of stays they created in the period. Collected is money they took at the desk."
      height={Math.max(240, staff.length * 48)}
    >
      <Bar
        data={{
          labels: staff.map((row) => row.name),
          datasets: [
            {
              label: 'Booked value',
              data: staff.map((row) => row.bookingRevenue),
              backgroundColor: LODGING_COLOR,
            },
            {
              label: 'Collected',
              data: staff.map((row) => row.collected),
              backgroundColor: COLLECTED_COLOR,
            },
          ],
        }}
        options={{
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (item) => `${item.dataset.label}: ${money(item.parsed.x ?? 0)}`,
                afterBody: (items) => {
                  const row = staff[items[0]?.dataIndex ?? -1];
                  if (!row) return [];
                  return [
                    `${row.bookings} booked`,
                    `${row.checkIns} check-ins · ${row.checkOuts} check-outs`,
                  ];
                },
              },
            },
          },
          scales: {
            x: moneyTicks(money),
            y: { ticks: { autoSkip: false } },
          },
        }}
      />
    </ChartPanel>
  );
}
