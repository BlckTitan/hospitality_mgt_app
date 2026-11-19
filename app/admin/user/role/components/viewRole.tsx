'use client';

import { PERMISSION_GROUPS } from '../../../../../lib/data';
import { Field } from '../../../../../shared/field';

function ReadOnlyText({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  return (
    <Field id={id} label={label} widthClass="w-full max-w-full min-w-0">
      <input id={id} type="text" value={value} readOnly />
    </Field>
  );
}

function ReadOnlyArea({
  id,
  label,
  value,
  rows,
}: {
  id: string;
  label: string;
  value: string;
  rows: number;
}) {
  return (
    <div className="w-full mb-3 last:mb-0">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        readOnly
        rows={rows}
        className="w-full border rounded p-2 bg-gray-50"
      />
    </div>
  );
}

export function RoleView({
  name,
  summary,
  reportsTo,
  descriptionSummary,
  responsibilities,
  qualifications,
  permissions,
  isSystemRole,
}: {
  name: string;
  summary: string;
  reportsTo: string;
  descriptionSummary: string;
  responsibilities: string;
  qualifications: string;
  permissions: Record<string, boolean>;
  isSystemRole: boolean;
}) {
  const granted = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="viewRole">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-2 lg:mb-4">
        <ReadOnlyText id="name" label="Role Name" value={name} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-2 lg:mb-4">
        <ReadOnlyText id="summary" label="Summary" value={summary} />
      </div>

      <fieldset className="w-full border rounded p-4 mb-4">
        <legend className="px-2 font-semibold">Description</legend>
        <div className="w-full mb-3">
          <ReadOnlyText id="reportsTo" label="Reports to" value={reportsTo} />
        </div>
        <ReadOnlyArea id="descriptionSummary" label="Summary" value={descriptionSummary} rows={4} />
        <ReadOnlyArea id="responsibilities" label="Responsibilities" value={responsibilities} rows={6} />
        <ReadOnlyArea id="qualifications" label="Qualifications" value={qualifications} rows={5} />
      </fieldset>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            defaultChecked={isSystemRole}
            disabled
            className="mr-2 !w-4 !h-3"
          />
          <span className="p-1 ml-2">System Role</span>
        </label>
        {isSystemRole && (
          <span className="text-sm text-gray-500">
            Name and permissions come from the RBAC config. Summary and description can be changed on the edit page.
          </span>
        )}
      </div>

      <div className="w-full mb-4">
        <label className="block mb-3 font-semibold">Permissions</label>
        <div className="border rounded p-4 max-h-96 overflow-y-auto">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.category} className="mb-4 last:mb-0">
              <h4 className="font-medium text-sm text-gray-700 mb-2 border-b pb-1">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-2 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={permissions[permission.key] || false}
                      disabled
                      className="!w-4 !h-3 !mr-2"
                    />
                    <span className="text-sm">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {granted} permission{granted === 1 ? '' : 's'} granted.
        </p>
      </div>
    </div>
  );
}
