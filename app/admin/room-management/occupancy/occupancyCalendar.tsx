'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const KIND_CLASS: Record<string, string> = {
  occupied: 'bg-blue-600 text-white',
  confirmed: 'bg-sky-400 text-white',
  pending: 'bg-yellow-500 text-white',
  blocked: 'bg-red-600 text-white',
  vacant: 'bg-slate-100 text-slate-500',
};

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function OccupancyCalendar({ propertyId }: { propertyId: Id<'properties'> }) {
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);
  const [roomTypeId, setRoomTypeId] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  const response = useQuery(
    api.occupancy.getOccupancyCalendar,
    cursor
      ? { propertyId, year: cursor.year, month: cursor.month }
      : { propertyId },
  );

  if (response === undefined) {
    return <div className="py-10 text-center">Loading occupancy…</div>;
  }
  if (!response.success || !response.data) {
    return (
      <div className="py-10 text-center text-red-600">
        {response.message || 'Unable to load occupancy.'}
      </div>
    );
  }

  const { days, rooms, summary, todayKey, timeZone, year, month } = response.data;
  const roomTypes = [...new Map(
    rooms
      .filter((room) => room.roomType)
      .map((room) => [room.roomType!._id, room.roomType!.name]),
  ).entries()];

  const visibleRooms = rooms.filter((room) => {
    if (!showInactive && !room.isActive) return false;
    if (roomTypeId !== 'all' && room.roomType?._id !== roomTypeId) return false;
    return true;
  });

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="border rounded px-3 py-1"
            onClick={() => setCursor(shiftMonth(year, month, -1))}
          >
            Previous
          </button>
          <h4 className="min-w-[10rem] text-center m-0">
            {MONTHS[month - 1]} {year}
          </h4>
          <button
            type="button"
            className="border rounded px-3 py-1"
            onClick={() => setCursor(shiftMonth(year, month, 1))}
          >
            Next
          </button>
          <button
            type="button"
            className="border rounded px-3 py-1"
            onClick={() => setCursor(null)}
          >
            Today
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="border rounded p-2"
            value={roomTypeId}
            onChange={(event) => setRoomTypeId(event.target.value)}
          >
            <option value="all">All room types</option>
            {roomTypes.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Show inactive
          </label>
          <span className="text-xs text-slate-500">{timeZone}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Occupancy" value={`${summary.occupancyRate.toFixed(1)}%`} />
        <Stat label="Sold nights" value={`${summary.soldNights} / ${summary.availableNights}`} />
        <Stat label="In house today" value={String(summary.occupiedToday)} />
        <Stat label="Not ready today" value={String(summary.notReadyToday)} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs mb-3">
        <Legend swatch="bg-blue-600" label="Checked in" />
        <Legend swatch="bg-sky-400" label="Confirmed / stayed" />
        <Legend swatch="bg-yellow-500" label="Pending" />
        <Legend swatch="bg-red-600" label="OOO / maintenance" />
        <Legend swatch="bg-slate-100 border" label="Vacant" />
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          Housekeeping
        </span>
      </div>

      {visibleRooms.length === 0 ? (
        <div className="py-10 text-center">No rooms to show for this filter.</div>
      ) : (
        <div className="w-full overflow-x-auto border rounded">
          <table className="min-w-max w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white border-b border-r px-2 py-2 text-left min-w-[8rem]">
                  Room
                </th>
                {days.map((day) => (
                  <th
                    key={day.dateKey}
                    className={`border-b px-0 py-2 min-w-[2.1rem] text-center ${
                      day.isToday ? 'bg-amber-50' : day.weekday === 0 || day.weekday === 6 ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500">{WEEKDAYS[day.weekday]}</div>
                    <div className={day.dateKey === todayKey ? 'font-semibold' : ''}>{day.day}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRooms.map((room) => (
                <tr key={room._id}>
                  <td className="sticky left-0 z-10 bg-white border-b border-r px-2 py-1 whitespace-nowrap">
                    <div className="font-medium">
                      {room.roomNumber}
                      {!room.isReady && (
                        <span className="ml-1 text-[10px] text-amber-600">Not ready</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {room.roomType?.name || 'No type'} · {room.status}
                    </div>
                  </td>
                  {room.cells.map((cell) => {
                    const label = cell.guestName
                      || (cell.kind === 'blocked' ? 'Blocked' : '')
                      || (cell.housekeeping ?? '');
                    const className = `${KIND_CLASS[cell.kind] ?? KIND_CLASS.vacant} ${
                      cell.kind === 'vacant' && !room.isActive ? 'opacity-40' : ''
                    }`;
                    const title = [
                      cell.guestName,
                      cell.confirmationNumber,
                      cell.status,
                      cell.housekeeping ? `HK: ${cell.housekeeping}` : null,
                    ].filter(Boolean).join(' · ');
                    const inner = (
                      <span className={`relative block h-8 leading-8 text-center truncate px-0.5 ${className}`}>
                        {label}
                        {cell.housekeeping ? (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                        ) : null}
                      </span>
                    );
                    return (
                      <td key={cell.dateKey} className="border-b border-l p-0" title={title || cell.kind}>
                        {cell.reservationId ? (
                          <Link
                            href={`/admin/room-management/reservation/edit?reservation_id=${cell.reservationId}`}
                            className="block no-underline"
                          >
                            {inner}
                          </Link>
                        ) : inner}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-3 h-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}
