'use client'

import { BackLink } from '../../../shared/pageHeader';
import Link from 'next/link';
import { usePermissions } from '../../../hooks/usePermissions';
import { ShiftPageGuide } from './components/shiftPageGuide';

const hubLinks = [
  { href: '/admin/shift-management/templates', label: 'Open Department shifts' },
  { href: '/admin/shift-management/attendance', label: 'Open Attendance Tracker' },
  { href: '/admin/shift-management/cover', label: 'Open Cover' },
  { href: '/admin/shift-management/shift', label: 'Open Shifts' },
  { href: '/admin/shift-management/hours', label: 'Open Hours' },
  { href: '/admin/shift-management/punctuality', label: 'Open Punctuality' },
];

export default function ShiftManagement() {
  const { canAccessRoute, isLoading } = usePermissions();
  const visibleLinks = hubLinks.filter((link) => canAccessRoute(link.href));

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Shift Management</h1>
        <ShiftPageGuide page="hub" />
      </div>
        <BackLink />
      </header>
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
