'use client';

type GuidePage = 'hub' | 'occupancy' | 'room-types' | 'rooms' | 'reservations' | 'guests';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Front desk home for this property. Reminders list short stays ending within the hour and overnight guests whose checkout is near. The month chart shows who is in each room each night. Create room types and rooms first, then book stays from Reservations. Housekeeping readiness is inferred from open tasks — room status is not dirty or cleaning.',
  occupancy:
    'Month tape chart of nights by room. Color is checked-in, confirmed, pending, short stay, or blocked (out-of-order / maintenance). A short stay is a 1–7 hour visit and does not count as a sold night. An amber dot means open housekeeping; Not ready means an open checkout-clean. Click a stay to open the reservation. Filter by room type. Occupancy % counts confirmed and in-house nights, not pending holds or short stays.',
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
  return <p className="text-gray-600">{DESCRIPTIONS[page]}</p>;
}
