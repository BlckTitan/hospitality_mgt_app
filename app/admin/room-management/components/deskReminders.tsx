'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '../../../../shared/button';
import { formatPropertyMoney, usePropertyCurrency } from '../../inventory-management/components/money';
import { useFrontOfficeDuty } from './useFrontOfficeDuty';

const FOLLOW_UP = [
  { value: 'not-contacted', label: 'Not contacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'extending', label: 'Extending' },
  { value: 'departing', label: 'Departing' },
] as const;

type FollowUp = (typeof FOLLOW_UP)[number]['value'];

function formatWhen(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function DeskReminders({ propertyId }: { propertyId: Id<'properties'> }) {
  const currency = usePropertyCurrency(propertyId);
  const response = useQuery(api.reservations.getDeskReminders, { propertyId });

  if (response === undefined) {
    return <p className="mb-4 text-sm text-slate-600">Loading desk reminders…</p>;
  }
  if (!response.success || !response.data) {
    return null;
  }

  const { shortStays, retainers, reminderDays } = response.data;
  const windowLabel = reminderDays === 0
    ? 'checkout today'
    : `checkout today or within ${reminderDays} day${reminderDays === 1 ? '' : 's'}`;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded border p-3">
        <h2 className="mb-1 text-base font-semibold">Short stays ending soon</h2>
        <p className="mb-3 text-sm text-slate-600">Checked-in visits that end within the next hour, or are already past their end time.</p>
        {shortStays.length === 0 ? (
          <p className="text-sm text-slate-600">None right now.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {shortStays.map((stay) => (
              <li key={stay._id} className="rounded border border-violet-200 p-2">
                <Link href={`/admin/room-management/reservation/edit?reservation_id=${stay._id}`} className="font-medium text-violet-800">
                  {stay.guestName} · Room {stay.roomNumber}
                </Link>
                <p className="mb-0 text-slate-600">
                  {stay.durationHours ? `${stay.durationHours}h · ` : ''}
                  ends {formatWhen(stay.checkOutDate)}
                  {stay.overdue ? ' · overdue' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border p-3">
        <h2 className="mb-1 text-base font-semibold">Retainers</h2>
        <p className="mb-3 text-sm text-slate-600">
          Checked-in overnight guests with {windowLabel}. A guest marked “may extend” also appears up to 7 days ahead.
        </p>
        {retainers.length === 0 ? (
          <p className="text-sm text-slate-600">No one to follow up with.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {retainers.map((guest) => (
              <li key={guest._id} className="rounded border p-2">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/admin/room-management/reservation/edit?reservation_id=${guest._id}`} className="font-medium">
                    {guest.guestName} · Room {guest.roomNumber}
                  </Link>
                  <span className="text-slate-600">
                    {guest.overdue ? 'Checkout was ' : 'Checkout '}
                    {new Date(guest.checkOutDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="mb-2 text-slate-600">
                  {guest.nightsSoFar} of {guest.bookedNights} nights · Balance {formatPropertyMoney(guest.balance, currency)}
                  {guest.mayExtend ? ' · May extend' : ''}
                </p>
                <RetainerActions
                  reservationId={guest._id}
                  followUp={guest.followUp}
                  note={guest.note}
                  followedUpBy={guest.followedUpBy}
                  followedUpAt={guest.followedUpAt}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function RetainerActions({
  reservationId,
  followUp,
  note,
  followedUpBy,
  followedUpAt,
  reloadOnSuccess = false,
}: {
  reservationId: Id<'reservations'>;
  followUp: string;
  note?: string | null;
  followedUpBy?: string | null;
  followedUpAt?: number | null;
  reloadOnSuccess?: boolean;
}) {
  const desk = useFrontOfficeDuty();
  const extendStay = useMutation(api.reservations.extendOvernightStay);
  const recordFollowUp = useMutation(api.reservations.recordRetainerFollowUp);
  const [nextFollowUp, setNextFollowUp] = useState<FollowUp>(
    FOLLOW_UP.some((item) => item.value === followUp) ? followUp as FollowUp : 'not-contacted',
  );
  const [nextNote, setNextNote] = useState(note ?? '');

  const run = async (work: () => Promise<{ success: boolean; message: string }>) => {
    try {
      const response = await work();
      if (response.success) {
        toast.success(response.message);
        if (reloadOnSuccess) window.location.reload();
      } else toast.error(response.message);
    } catch (error) {
      console.error(error);
      toast.error('Could not update this stay');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline-secondary"
          disabled={desk.blocked}
          onClick={() => run(() => extendStay({ reservationId, extraNights: 1 }))}
        >
          +1 night
        </Button>
        <Button
          type="button"
          variant="outline-secondary"
          disabled={desk.blocked}
          onClick={() => run(() => extendStay({ reservationId, extraNights: 2 }))}
        >
          +2 nights
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded border p-1"
          value={nextFollowUp}
          onChange={(event) => setNextFollowUp(event.target.value as FollowUp)}
        >
          {FOLLOW_UP.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <input
          className="min-w-[10rem] flex-1 rounded border p-1"
          value={nextNote}
          placeholder="Note for the next shift"
          onChange={(event) => setNextNote(event.target.value)}
        />
        <Button
          type="button"
          variant="dark"
          disabled={desk.blocked}
          onClick={() => run(() => recordFollowUp({
            reservationId,
            followUp: nextFollowUp,
            note: nextNote.trim() || undefined,
          }))}
        >
          Save follow-up
        </Button>
      </div>
      {followedUpBy && followedUpAt ? (
        <p className="mb-0 text-xs text-slate-500">
          Last update: {followedUpBy} · {formatWhen(followedUpAt)}
        </p>
      ) : null}
    </div>
  );
}
