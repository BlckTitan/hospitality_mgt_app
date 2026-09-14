'use client'

import { BackLink } from '../../../shared/pageHeader';
import Link from 'next/link';
import { PayrollPageGuide } from './components/payrollPageGuide';
import { usePermissions } from '../../../hooks/usePermissions';

const hubLinks = [
  { href: '/admin/payroll-management/payroll', label: 'Open Payroll' },
  { href: '/admin/shift-management/hours', label: 'Open Hours' },
  { href: '/admin/payroll-management/time-off', label: 'Open Time off' },
  { href: '/admin/payroll-management/settings', label: 'Open Payroll settings' },
];

export default function PayrollManagementPage() {
  const { canAccessRoute, isLoading } = usePermissions();
  const visibleLinks = hubLinks.filter((link) => canAccessRoute(link.href));

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Payroll</h3>
        <BackLink />
      </header>
      <PayrollPageGuide page="hub" />
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
