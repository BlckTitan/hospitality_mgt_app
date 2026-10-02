'use client';

type GuidePage = 'hub' | 'occupancy' | 'room-types' | 'rooms' | 'reservations' | 'guests';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Front desk home for this property. The month chart shows who is in each room each night. Create room types and rooms first, then book stays from Reservations (search or create the guest there). Housekeeping readiness is inferred from open tasks — room status is not dirty or cleaning.',
  occupancy:
    'Month tape chart of nights by room. Color is checked-in, confirmed, pending, or blocked (out-of-order / maintenance). An amber dot means open housekeeping; Not ready means an open checkout-clean. Click a stay to open the reservation. Filter by room type. Occupancy % counts confirmed and in-house nights, not pending holds.',
  'room-types':
    'Categories such as Standard or Deluxe: max guests, base rate, and amenities. Create a type before you add rooms. You cannot delete a type that still has rooms.',
  rooms:
    'Physical inventory. Status is available, occupied, out-of-order, or maintenance — not dirty or cleaning. Readiness comes from open housekeeping. Occupied is set on check-in, not when a future stay is confirmed. Floor and room number are required; numbers must be unique in the property.',
  reservations:
    'Book a stay: search for an existing guest or create one inline, then choose room and dates as pending or confirmed. The signed-in receptionist is recorded on the booking. Those stays block the nights. Use Confirm, Check in, Check out, or Cancel — do not pick status from a dropdown. Check-in occupies the room and can collect payment; check-out frees it, can collect the balance, and opens a checkout-clean. Any amount collected needs evidence: cash attestation at the desk, or a receipt / transfer file for other methods. Guest count cannot exceed the room type’s max.',
  guests:
    'Guest profiles (CRM). Enrich photo, loyalty, and contact details here. Use Book stay to open a new reservation with that guest selected. You cannot delete a guest who still has a reservation.',
};

export function RoomPageGuide({ page }: { page: GuidePage }) {
  return <p className="text-gray-600">{DESCRIPTIONS[page]}</p>;
}
