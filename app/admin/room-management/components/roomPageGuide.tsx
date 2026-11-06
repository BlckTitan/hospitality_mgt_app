'use client';

import { PageGuide } from '../../../../shared/pageGuide';

type GuidePage = 'hub' | 'occupancy' | 'summary' | 'room-types' | 'rooms' | 'reservations' | 'guests';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Front desk home for this property. Reminders list short stays ending within the hour and overnight guests whose checkout is near. Lodging shows revenue, collections, occupancy, and ADR for the selected day, week, month, or year, compared with the same dates last year. The month chart shows who is in each room each night. Create room types and rooms first, then book stays from Reservations. Housekeeping readiness is inferred from open tasks — room status is not dirty or cleaning.',
  occupancy:
    'Month tape chart of nights by room. Color is checked-in, confirmed, pending, short stay, or blocked (out-of-order / maintenance). A short stay is a 1–7 hour visit and does not count as a sold night. An amber dot means open housekeeping; Not ready means an open checkout-clean. Click a stay to open the reservation. Filter by room type. Occupancy % counts confirmed and in-house nights, not pending holds or short stays.',
  summary:
    'Lodging results for this property. Pick a date, then Day, Week, Month, or Year. Figures run through today when the period is still open, and the comparison is the same elapsed dates last year. Shift close lists each finalized front-office shift that ended on the selected date: what that person booked and what they collected. An open shift is left out until it is ended. Trends, Rooms, Days, and Staff use confirmed, in-house, and checked-out stays. Pending and cancelled stays are left out. Room revenue is the nightly rate for nights inside the period. Short stays count on the day they start and are not sold nights. Collected is reservation money taken at the desk. Booked value is the full price of stays sold in the period, including nights that fall later. Occupancy uses rooms that are sellable now, so a room that is out of order today is left out of earlier dates too.',
  'room-types':
    'Categories such as Standard or Deluxe: max guests, nightly base rate, short-stay prices for 1–7 hours, and amenities. A blank short-stay length is not sold. Create a type before you add rooms. You cannot delete a type that still has rooms.',
  rooms:
    'Physical inventory. Status is available, occupied, out-of-order, or maintenance — not dirty or cleaning. Readiness comes from open housekeeping. Occupied is set on check-in, not when a future stay is confirmed. Floor and room number are required; numbers must be unique in the property.',
  reservations:
    'Book an overnight stay or a short stay of 1–7 hours. A short stay uses the room type’s package price and does not take the night. A room reserved for an overnight stay is not offered for a short stay on those nights, including the morning of arrival. Search for an existing guest or create one inline, then save as pending or confirmed. The signed-in receptionist is recorded on the booking. Use Confirm, Check in, Check out, or Cancel — do not pick status from a dropdown. Check-in occupies the room and can collect payment; check-out frees it, can collect the balance, and opens a checkout-clean. Mark an overnight guest as “may extend” when their length of stay is uncertain. Any amount collected needs evidence: cash attestation at the desk, or a receipt / transfer file for other methods. Guest count cannot exceed the room type’s max.',
  guests:
    'Guest profiles (CRM). Enrich photo, loyalty, and contact details here. Use Book stay to open a new reservation with that guest selected. You cannot delete a guest who still has a reservation.',
};

export function RoomPageGuide({ page }: { page: GuidePage }) {
  return <PageGuide text={DESCRIPTIONS[page]} />;
}
