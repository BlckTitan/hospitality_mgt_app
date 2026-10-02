'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { DASHBOARD_PATH, getPostLoginPath } from '../lib/route-access';

export function parentAdminPath(pathname: string, homePath = DASHBOARD_PATH): string | null {
  const clean = pathname.split('?')[0].replace(/\/$/, '') || '/';
  if (clean === DASHBOARD_PATH || clean === '/admin' || clean === homePath) {
    return null;
  }

  const parts = clean.split('/').filter(Boolean);
  if (parts.length <= 2) {
    return homePath;
  }

  parts.pop();
  return `/${parts.join('/')}`;
}

export function BackLink({ href }: { href?: string }) {
  const pathname = usePathname();
  const { hasGranularPermission } = usePermissions();
  const homePath = getPostLoginPath(hasGranularPermission);
  const to = href ?? parentAdminPath(pathname, homePath);
  if (!to) {
    return null;
  }

  return (
    <Link
      href={to}
      className="text-sm text-blue-600 hover:underline whitespace-nowrap !no-underline"
    >
      ← Back
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {description ? <p className="text-gray-600">{description}</p> : null}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <BackLink />
        {actions}
      </div>
    </header>
  );
}
