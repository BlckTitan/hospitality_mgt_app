'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { formatPropertyMoney } from '../../inventory-management/components/money';
import {
  CASH_PERIOD_KINDS,
  cashPeriodBounds,
  cashPeriodLabel,
  shiftCashPeriodAnchor,
  type CashPeriodKind,
} from '../../../../lib/cashPeriod';
import { EXPENSE_CATEGORY_OPTIONS } from '../../expenses/components/categoryLabels';

function formatWhen(value?: number) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

function Kpi({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="w-full border p-3">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`text-2xl font-semibold ${warn ? 'text-red-600' : ''}`}>{value}</p>
    </div>
  );
}

function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`grid w-full grid-cols-1 gap-3 ${className ?? ''}`}>{children}</div>;
}

function CardShell({
  href,
  linkLabel,
  children,
}: {
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white border p-4">
      <div className="flex justify-end mb-4">
        <Link href={href} className="text-sm text-blue-600">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

export function FinancialReportCard({
  propertyId,
  currency,
  timeZone,
}: {
  propertyId: Id<'properties'>;
  currency?: string;
  timeZone?: string;
}) {
  const zone = timeZone?.trim() || 'UTC';
  const [kind, setKind] = useState<CashPeriodKind>('month');
  const [anchor, setAnchor] = useState(() => Date.now());
  const range = useMemo(() => cashPeriodBounds(anchor, kind, zone), [anchor, kind, zone]);
  const label = useMemo(() => cashPeriodLabel(anchor, kind, zone), [anchor, kind, zone]);
  const report = useQuery(api.dashboard.getFinancialReport, {
    propertyId,
    start: range.start,
    end: range.end,
  });

  if (report === undefined) {
    return <section className="bg-white border p-4">Loading P&L…</section>;
  }
  const data = report.data;
  if (!data) {
    return <section className="bg-white border p-4">Could not load the financial report.</section>;
  }

  const money = (value: number) => formatPropertyMoney(value, currency);

  return (
    <section className="border p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {CASH_PERIOD_KINDS.map((periodKind) => (
          <Button
            key={periodKind}
            size="sm"
            variant={kind === periodKind ? 'dark' : 'outline-dark'}
            onClick={() => {
              setKind(periodKind);
              setAnchor(Date.now());
            }}
          >
            {periodKind.charAt(0).toUpperCase() + periodKind.slice(1)}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline-dark"
          onClick={() => setAnchor(shiftCashPeriodAnchor(anchor, kind, zone, -1))}
        >
          Previous
        </Button>
        <span className="px-2 font-medium">{label}</span>
        <Button
          size="sm"
          variant="outline-dark"
          onClick={() => setAnchor(shiftCashPeriodAnchor(anchor, kind, zone, 1))}
        >
          Next
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => setAnchor(Date.now())}>
          Today
        </Button>
      </div>

      <KpiGrid className="mb-6 md:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Occupancy" value={formatPct(data.occupancyRate)} />
        <Kpi label="ADR (Average Daily Rate)" value={money(data.adr)} />
        <Kpi label="RevPAR (Revenue Per Available Room)" value={money(data.revpar)} />
        <Kpi label="TRevPAR (Total Revenue Per Available Room)" value={money(data.trevpar)} />
        <Kpi label="GOP (Gross Operating Profit)" value={money(data.gop)} warn={data.gop < 0} />
        <Kpi label="GOPPAR (Gross Operating Profit Per Available Room)" value={money(data.goppar)} warn={data.goppar < 0} />
      </KpiGrid>
      <p className="text-sm text-slate-600 mb-4">
        {data.roomsSoldNights} room nights sold · {data.availableRoomNights} available
        ({data.sellableRooms} sellable rooms × {data.nights} nights) · GOP margin {formatPct(data.gopMargin)}
        · Labor cost {formatPct(data.laborCostPct)}
        {' · '}
        <Link href="/admin/expenses" className="text-blue-600">
          Expenses ledger
        </Link>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        <div>
          <h4 className="font-semibold mb-2">Revenue</h4>
          <table className="w-full border">
            <tbody>
              <tr className="border-t">
                <td className="p-2">Rooms</td>
                <td className="p-2 text-right">{money(data.roomRevenue)}</td>
              </tr>
              <tr className="border-t">
                <td className="p-2">F&B</td>
                <td className="p-2 text-right">{money(data.fnbRevenue)}</td>
              </tr>
              <tr className="border-t font-semibold">
                <td className="p-2">Total revenue</td>
                <td className="p-2 text-right">{money(data.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Expenses</h4>
          <table className="w-full border">
            <tbody>
              {EXPENSE_CATEGORY_OPTIONS.map((item) => (
                <tr key={item.value} className="border-t">
                  <td className="p-2">{item.label}</td>
                  <td className="p-2 text-right">{money(data.expenses[item.value])}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td className="p-2">Total expenses</td>
                <td className="p-2 text-right">{money(data.totalExpenses)}</td>
              </tr>
              <tr className="border-t font-semibold">
                <td className="p-2">Gross operating profit</td>
                <td className={`p-2 text-right ${data.gop < 0 ? 'text-red-600' : ''}`}>{money(data.gop)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function RoomsCard({ propertyId }: { propertyId: Id<'properties'> }) {
  const snapshot = useQuery(api.dashboard.getRoomsSnapshot, { propertyId });
  if (snapshot === undefined) {
    return <section className="border p-4">Loading rooms…</section>;
  }
  const data = snapshot.data;
  if (!data) {
    return null;
  }

  return (
    <CardShell href="/admin/room-management/reservation" linkLabel="Reservations">
      <KpiGrid className="mb-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Available" value={data.roomCounts.available} />
        <Kpi label="Occupied" value={data.roomCounts.occupied} />
        <Kpi label="In house" value={data.inHouse} />
        <Kpi label="Arrivals" value={data.arrivalCount} />
      </KpiGrid>
      <p className="text-sm text-slate-600 mb-2">
        Out of order {data.roomCounts.outOfOrder} · Maintenance {data.roomCounts.maintenance} · Departures {data.departureCount}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium mb-1">Today’s arrivals</p>
          {data.arrivals.length === 0 ? (
            <p className="text-slate-600">None</p>
          ) : (
            <ul className="space-y-1">
              {data.arrivals.map((row) => (
                <li key={row._id}>
                  {row.confirmationNumber} · {row.guestLastName} · Room {row.roomNumber}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="font-medium mb-1">Today’s departures</p>
          {data.departures.length === 0 ? (
            <p className="text-slate-600">None</p>
          ) : (
            <ul className="space-y-1">
              {data.departures.map((row) => (
                <li key={row._id}>
                  {row.confirmationNumber} · {row.guestLastName} · Room {row.roomNumber}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Link href="/admin/room-management/room" className="inline-block mt-3 text-sm text-blue-600">
        Rooms
      </Link>
    </CardShell>
  );
}

export function HousekeepingCard({ propertyId }: { propertyId: Id<'properties'> }) {
  const snapshot = useQuery(api.dashboard.getHousekeepingSnapshot, { propertyId });
  if (snapshot === undefined) {
    return <section className="border p-4">Loading housekeeping…</section>;
  }
  const data = snapshot.data;
  if (!data) {
    return null;
  }

  return (
    <CardShell href="/admin/room-management/housekeeping-task" linkLabel="Board">
      <KpiGrid className="mb-4 md:grid-cols-3">
        <Kpi label="Open" value={data.open} />
        <Kpi label="Overdue" value={data.overdue} warn={data.overdue > 0} />
        <Kpi label="Unassigned" value={data.unassigned} />
      </KpiGrid>
      {data.overdueTitles.length === 0 ? (
        <p className="text-sm text-slate-600">No overdue tasks.</p>
      ) : (
        <ul className="text-sm space-y-1">
          {data.overdueTitles.map((row) => (
            <li key={row._id} className="text-red-600">
              {row.taskType} — Room {row.roomNumber} · {formatWhen(row.dueAt)}
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

export function InventoryCard({
  propertyId,
  currency,
}: {
  propertyId: Id<'properties'>;
  currency?: string;
}) {
  const dashboard = useQuery(api.inventoryItems.getInventoryDashboard, { propertyId });
  if (dashboard === undefined) {
    return <section className="border p-4">Loading inventory…</section>;
  }
  const data = dashboard.data;
  if (!dashboard.success || !data) {
    return null;
  }

  return (
    <CardShell href="/admin/inventory-management" linkLabel="Inventory hub">
      <KpiGrid className="md:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active items" value={data.activeItemCount} />
        <Kpi label="On-hand value" value={formatPropertyMoney(data.stockValue, currency)} />
        <Kpi label="Low stock" value={data.lowStockCount} warn={data.lowStockCount > 0} />
        <Kpi label="Open POs" value={data.openPoCount} />
      </KpiGrid>
    </CardShell>
  );
}

export function FnBCard({
  propertyId,
  currency,
  canReadInventory,
}: {
  propertyId: Id<'properties'>;
  currency?: string;
  canReadInventory: boolean;
}) {
  const snapshot = useQuery(api.dashboard.getFnBTodaySnapshot, { propertyId });
  const alerts = useQuery(
    api.reorderAlerts.getOpenReorderAlerts,
    canReadInventory ? { propertyId } : 'skip',
  );
  if (snapshot === undefined || (canReadInventory && alerts === undefined)) {
    return <section className="bg-white border p-4">Loading F&B…</section>;
  }
  const data = snapshot.data;
  if (!data) {
    return null;
  }

  return (
    <CardShell href="/admin/bar-management" linkLabel="Bar management">
      <KpiGrid className="md:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Qty sold" value={data.totalQtySold} />
        <Kpi label="Revenue" value={formatPropertyMoney(data.totalRevenue, currency)} />
        <Kpi label="Gross profit" value={formatPropertyMoney(data.grossProfit ?? (data.totalRevenue - (data.totalCogs ?? 0)), currency)} />
        <Kpi label="Open logs" value={data.openLogCount} />
        <Kpi
          label="Reorder alerts"
          value={canReadInventory ? (alerts?.data?.length ?? 0) : '—'}
          warn={Boolean(alerts?.data?.length)}
        />
      </KpiGrid>
    </CardShell>
  );
}

export function BillingCard({
  propertyId,
  currency,
}: {
  propertyId: Id<'properties'>;
  currency?: string;
}) {
  const dashboard = useQuery(api.billing.listDashboard, { propertyId });
  if (dashboard === undefined) {
    return <section className="border p-4">Loading billing…</section>;
  }
  const data = dashboard.data;
  if (!data) {
    return null;
  }

  const overdue = data.overdue ?? [];
  const dueThisWeek = data.dueThisWeek ?? [];

  return (
    <CardShell href="/admin/billing" linkLabel="Billing hub">
      <KpiGrid className="mb-4 md:grid-cols-3">
        <Kpi label="Accounts" value={data.accountCount} />
        <Kpi label="Overdue" value={overdue.length} warn={overdue.length > 0} />
        <Kpi label="Due this week" value={dueThisWeek.length} />
      </KpiGrid>
      {overdue.slice(0, 3).length > 0 && (
        <ul className="text-sm space-y-1">
          {overdue.slice(0, 3).map((row) => (
            <li key={row._id} className="text-red-600">
              {row.accountName} · {formatPropertyMoney(row.amount, currency)}
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}
