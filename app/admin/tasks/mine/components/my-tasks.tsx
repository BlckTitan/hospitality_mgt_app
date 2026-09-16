'use client'

import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import Link from 'next/link';

export default function MyTasksComponent() {
  const { isAuthenticated } = useConvexAuth();
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id as Id<'properties'> | undefined;
  const mine = useQuery(
    api.taskBoards.getMyTasks,
    isAuthenticated && currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );

  if (propertiesResponse === undefined || (currentPropertyId && mine === undefined)) {
    return <p className="p-4">Loading</p>;
  }

  if (!propertiesResponse?.data?.length) {
    return <p className="p-4">No properties yet!</p>;
  }

  const rows = mine?.data ?? [];

  return (
    <div className="w-full h-full">
      {rows.length === 0 && <p>No tasks assigned to you.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Task</th>
              <th className="p-2">Module</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Due</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.task._id}`} className="border-t">
                <td className="p-2">{row.title}</td>
                <td className="p-2">{row.kind}</td>
                <td className="p-2">{row.role}</td>
                <td className="p-2">
                  <span className={row.overdue ? 'text-red-600 font-semibold' : ''}>
                    {row.status}{row.overdue ? ' (overdue)' : ''}
                  </span>
                </td>
                <td className="p-2">{row.dueAt ? new Date(row.dueAt).toLocaleString() : '—'}</td>
                <td className="p-2">
                  <Link href={row.href} className="!text-amber-500">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
