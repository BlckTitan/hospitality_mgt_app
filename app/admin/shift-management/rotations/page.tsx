'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { BackLink } from '../../../../shared/pageHeader';
import { Button } from '../../../../shared/button';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { ShiftPageGuide } from '../components/shiftPageGuide';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from '../shift/components/validation';

type SegmentDraft = { kind: 'on' | 'off'; hours: number; minutes: number };

const DAY: SegmentDraft[] = [
  { kind: 'on', hours: 24, minutes: 0 },
  { kind: 'off', hours: 24, minutes: 0 },
];

const DAY_AND_HALF: SegmentDraft[] = [
  { kind: 'on', hours: 36, minutes: 0 },
  { kind: 'off', hours: 36, minutes: 0 },
];

function toMinutes(segment: SegmentDraft) {
  return Number(segment.hours) * 60 + Number(segment.minutes);
}

export default function RotationsPage() {
  const userContext = useQuery(api.authContext.getCurrentUserContext);
  const propertyId = userContext?.propertyId || '';
  const rotations = useQuery(
    api.rotations.listRotations,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  );
  const staffResponse = useQuery(
    api.shifts.listStaffForShifts,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  );
  const templates = useQuery(
    api.shiftTemplates.listShiftTemplates,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  );
  const createRotation = useMutation(api.rotations.createRotation);
  const deleteRotation = useMutation(api.rotations.deleteRotation);
  const assignStaff = useMutation(api.rotations.assignStaffRotation);
  const clearAssignment = useMutation(api.rotations.clearStaffRotation);

  const [name, setName] = useState('');
  const [department, setDepartment] = useState<(typeof SHIFT_DEPARTMENTS)[number]>('front-office');
  const [shiftTemplateId, setShiftTemplateId] = useState('');
  const [segments, setSegments] = useState<SegmentDraft[]>(DAY);
  const [staffId, setStaffId] = useState('');
  const [rotationId, setRotationId] = useState('');
  const [anchorLocal, setAnchorLocal] = useState('');

  if (userContext === undefined || (propertyId && rotations === undefined)) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }
  if (!propertyId) {
    return <div className="w-full h-full flex justify-center items-center"><p className="text-xl">No properties yet!</p></div>;
  }

  const dutyOptions = (templates?.data ?? []).filter((row) => row.isActive && row.department === department);

  const saveRotation = async (event: FormEvent) => {
    event.preventDefault();
    const response = await createRotation({
      propertyId: propertyId as Id<'properties'>,
      department,
      name,
      shiftTemplateId: shiftTemplateId ? shiftTemplateId as Id<'shiftTemplates'> : undefined,
      segments: segments.map((segment) => ({ kind: segment.kind, durationMinutes: toMinutes(segment) })),
    });
    if (response.success === false) {
      toast.error(response.message);
      return;
    }
    toast.success(response.message);
    setName('');
    setSegments(DAY);
    setShiftTemplateId('');
  };

  const saveAssignment = async (event: FormEvent) => {
    event.preventDefault();
    if (!staffId || !rotationId) {
      toast.error('Choose a staff member and a rotation');
      return;
    }
    const response = await assignStaff({
      propertyId: propertyId as Id<'properties'>,
      staffId: staffId as Id<'staffs'>,
      rotationId: rotationId as Id<'rotations'>,
      anchorLocal,
    });
    if (response.success === false) {
      toast.error(response.message);
      return;
    }
    toast.success(response.message);
  };

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Rotations</h1>
          <ShiftPageGuide page="rotations" />
        </div>
        <BackLink />
      </header>

      <form onSubmit={saveRotation} className="max-w-xl border p-4 mb-6">
        <h2 className="font-semibold mb-3">New rotation</h2>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Name *</span>
          <input className="w-full border rounded p-2" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Department *</span>
          <select
            className="w-full border rounded p-2"
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value as (typeof SHIFT_DEPARTMENTS)[number]);
              setShiftTemplateId('');
            }}
          >
            {SHIFT_DEPARTMENTS.map((item) => (
              <option key={item} value={item}>{DEPARTMENT_LABELS[item]}</option>
            ))}
          </select>
        </label>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Duty while on</span>
          <select className="w-full border rounded p-2" value={shiftTemplateId} onChange={(event) => setShiftTemplateId(event.target.value)}>
            <option value="">Staff member&apos;s department shift</option>
            {dutyOptions.map((row) => (
              <option key={row._id} value={row._id}>{row.name}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 mb-3">
          <Button type="button" variant="secondary" onClick={() => setSegments(DAY)}>1 day on, 1 day off</Button>
          <Button type="button" variant="secondary" onClick={() => setSegments(DAY_AND_HALF)}>1½ days on, 1½ days off</Button>
        </div>
        {segments.map((segment, index) => (
          <div key={index} className="grid grid-cols-4 gap-2 mb-2 items-end">
            <label className="block">
              <span className="block text-sm mb-1">Segment</span>
              <select
                className="w-full border rounded p-2"
                value={segment.kind}
                onChange={(event) => {
                  const next = [...segments];
                  next[index] = { ...segment, kind: event.target.value as 'on' | 'off' };
                  setSegments(next);
                }}
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-sm mb-1">Hours</span>
              <input
                type="number"
                min={0}
                max={72}
                className="w-full border rounded p-2"
                value={segment.hours}
                onChange={(event) => {
                  const next = [...segments];
                  next[index] = { ...segment, hours: Number(event.target.value) };
                  setSegments(next);
                }}
              />
            </label>
            <label className="block">
              <span className="block text-sm mb-1">Minutes</span>
              <input
                type="number"
                min={0}
                max={59}
                className="w-full border rounded p-2"
                value={segment.minutes}
                onChange={(event) => {
                  const next = [...segments];
                  next[index] = { ...segment, minutes: Number(event.target.value) };
                  setSegments(next);
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline-danger"
              onClick={() => setSegments(segments.filter((_, item) => item !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <div className="flex gap-2 mt-3">
          <Button type="button" variant="secondary" onClick={() => setSegments([...segments, { kind: 'off', hours: 24, minutes: 0 }])}>
            Add segment
          </Button>
          <Button type="submit" variant="dark">Save rotation</Button>
        </div>
      </form>

      <div className="mb-6 overflow-x-auto">
        {!rotations?.data?.length ? (
          <p className="text-sm text-gray-600">No rotations yet.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Department</th>
                <th className="p-2 text-left">Cycle</th>
                <th className="p-2 text-left">People</th>
                <th className="p-2 text-left" />
              </tr>
            </thead>
            <tbody>
              {rotations.data.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-2">{row.name}{row.dutyName ? ` · ${row.dutyName}` : ''}</td>
                  <td className="p-2">{DEPARTMENT_LABELS[row.department as (typeof SHIFT_DEPARTMENTS)[number]] ?? row.department}</td>
                  <td className="p-2">{row.cycleLabel}</td>
                  <td className="p-2">{row.assignmentCount}</td>
                  <td className="p-2 text-right">
                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      onClick={async () => {
                        const response = await deleteRotation({ rotationId: row._id });
                        if (response.success === false) toast.error(response.message);
                        else toast.success(response.message);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={saveAssignment} className="max-w-xl border p-4 mb-6">
        <h2 className="font-semibold mb-3">Place a person on a rotation</h2>
        <p className="text-sm text-gray-600 mb-3">The anchor is when their first on-duty begins. A second person on the same rotation starts one segment later, so the desk stays covered.</p>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Staff *</span>
          <select className="w-full border rounded p-2" value={staffId} onChange={(event) => setStaffId(event.target.value)} required>
            <option value="">Select staff</option>
            {(staffResponse?.data ?? [])
              .filter((row) => {
                const selected = (rotations?.data ?? []).find((item) => item._id === rotationId);
                return !selected || !row.department || row.department === selected.department;
              })
              .map((row) => (
                <option key={row._id} value={row._id}>{row.firstName} {row.lastName}</option>
              ))}
          </select>
        </label>
        <label className="block mb-3">
          <span className="block text-sm mb-1">Rotation *</span>
          <select
            className="w-full border rounded p-2"
            value={rotationId}
            onChange={(event) => {
              setRotationId(event.target.value);
              setStaffId('');
            }}
            required
          >
            <option value="">Select rotation</option>
            {(rotations?.data ?? []).filter((row) => row.isActive).map((row) => (
              <option key={row._id} value={row._id}>{row.name}</option>
            ))}
          </select>
        </label>
        <label className="block mb-3">
          <span className="block text-sm mb-1">First on-duty starts *</span>
          <input className="w-full border rounded p-2" type="datetime-local" value={anchorLocal} onChange={(event) => setAnchorLocal(event.target.value)} required />
        </label>
        <Button type="submit" variant="dark">Assign</Button>
      </form>

      <div>
        <h2 className="font-semibold mb-2">Current assignments</h2>
        {!rotations?.assignments?.length ? (
          <p className="text-sm text-gray-600">Nobody is on a rotation yet. Staff without one keep their department shift hours.</p>
        ) : (
          <ul className="text-sm flex flex-col gap-2">
            {rotations.assignments.map((row) => (
              <li key={row._id} className="flex items-center justify-between gap-3 border p-2">
                <span>{row.staffName} · {row.rotationName} · from {row.anchorLabel}</span>
                <Button
                  type="button"
                  variant="outline-danger"
                  size="sm"
                  onClick={async () => {
                    const response = await clearAssignment({ assignmentId: row._id });
                    if (response.success === false) toast.error(response.message);
                    else toast.success(response.message);
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
