'use client'

import Link from 'next/link';
import { BackLink } from '../../../../../shared/pageHeader';
import { useQuery, useConvexAuth } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import React from 'react'
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import Spinner from '../../../../../shared/spinner';
import { RoleView } from '../components/viewRole';
import { roleDescriptionParts, roleSummaryText } from '../../../../../convex/lib/roleText';
import { usePermissions } from '../../../../../hooks/usePermissions';

export default function Page() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission('roles.update');
  const searchParams = useSearchParams();
  const id = searchParams.get("role_id") ?? null;
  const response = useQuery(
    api.roles.getRole,
    !isLoading && isAuthenticated && id ? { role_id: id as Id<'roles'> } : 'skip',
  );

  if (isLoading || response === undefined) {
    return <div className='w-full h-screen flex items-center justify-center'><Spinner  size='sm'  /></div>;
  }
  if (!response.success || !response.data) {
    return <div className="p-4 text-gray-600">{response.message ?? 'No data available!'}</div>;
  }

  const role = response.data;
  const description = roleDescriptionParts(role);
  const permissions = (role.permissions && typeof role.permissions === 'object'
    ? role.permissions
    : {}) as Record<string, boolean>;

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">{role.name}</h1>
          <p className="text-gray-600">This role’s summary, description, and the permissions it grants.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canUpdate && (
            <Link
              href={`/admin/user/role/edit?role_id=${role._id}`}
              className="text-sm text-amber-600 whitespace-nowrap !no-underline hover:underline"
            >
              Edit
            </Link>
          )}
          <BackLink />
        </div>
      </header>

      <RoleView
        name={role.name}
        summary={roleSummaryText(role) ?? ''}
        reportsTo={description.reportsTo ?? ''}
        descriptionSummary={description.summary ?? ''}
        responsibilities={description.responsibilities ?? ''}
        qualifications={description.qualifications ?? ''}
        permissions={permissions}
        isSystemRole={role.isSystemRole}
      />
    </div>
  );
}
