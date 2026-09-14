'use client'

import { BackLink } from '../../../shared/pageHeader';
import Link from 'next/link';
import { usePermissions } from '../../../hooks/usePermissions';

const hubLinks = [
  { href: '/admin/shift-management/templates', label: 'Open Department shifts' },
  { href: '/admin/shift-management/attendance', label: 'Open Attendance Tracker' },
  { href: '/admin/shift-management/cover', label: 'Open Cover' },
  { href: '/admin/shift-management/shift', label: 'Open Shifts' },
  { href: '/admin/shift-management/hours', label: 'Open Hours' },
];

export default function ShiftManagement() {
  const { canAccessRoute, isLoading } = usePermissions();
  const visibleLinks = hubLinks.filter((link) => canAccessRoute(link.href));

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Shift Management</h3>
        <BackLink />
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Define department shifts, then onboard staff into that department. Staff start and end their shift on Attendance Tracker.
        Use Cover when someone else works the day. Ad-hoc Shifts remain available. Finalize or sign out creates draft Hours for payroll.
      </p>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
