'use client'

import { Suspense } from 'react';
import { useQuery } from 'convex/react';
import { MdEditDocument } from 'react-icons/md';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../../shared/table';
import PaginationComponent from '../../../../../shared/pagination';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from './validation';

type TemplateRow = {
  _id: string;
  name: string;
  department: string;
  startTime: string;
  endTime: string;
  barName?: string;
  isDefault: boolean;
  isActive: boolean;
  assignedCount: number;
};

function departmentLabel(value?: string) {
  if (value && SHIFT_DEPARTMENTS.includes(value as (typeof SHIFT_DEPARTMENTS)[number])) {
    return DEPARTMENT_LABELS[value as (typeof SHIFT_DEPARTMENTS)[number]];
  }
  return value || '—';
}

export default function Templates({ currentPropertyId }: { currentPropertyId: Id<'properties'> }) {
  const templates = useQuery(
    api.shiftTemplates.listShiftTemplates,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );

  const tableColumns: TableColumn<TemplateRow>[] = [
    { label: 'Name', key: 'name' },
    {
      label: 'Department',
      key: 'department',
      render: (_value, row) => <span>{departmentLabel(row.department)}</span>,
    },
    {
      label: 'Hours',
      key: 'startTime',
      render: (_value, row) => <span>{row.startTime}–{row.endTime}</span>,
    },
    {
      label: 'Bar',
      key: 'barName',
      render: (_value, row) => <span>{row.barName || '—'}</span>,
    },
    {
      label: 'Default',
      key: 'isDefault',
      render: (_value, row) => <span>{row.isDefault ? 'Yes' : 'No'}</span>,
    },
    {
      label: 'Status',
      key: 'isActive',
      render: (_value, row) => (
        <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-yellow-600'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      ),
    },
    { label: 'Staff assigned', key: 'assignedCount' },
    {
      label: 'Action',
      key: '_id',
      render: (_value, row) => (
        <a
          href={`/admin/shift-management/templates/edit?template_id=${row._id}`}
          className="!mr-2 !no-underline !text-amber-400"
        >
          <i className="icon"><MdEditDocument /></i>
        </a>
      ),
    },
  ];

  if (templates === undefined) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }

  if (!templates.data?.length) {
    return <p className="text-sm text-gray-600">No department shifts yet. Use + to add one for F&amp;B, housekeeping, and so on.</p>;
  }

  return (
    <div className="w-full h-full overflow-x-scroll lg:!overflow-x-hidden">
      <Suspense>
        <PaginationComponent
          collectionName="shifts"
          columns={tableColumns}
          jointTableData={(templates?.success === true) && templates?.data}
        />
      </Suspense>
    </div>
  );
}
