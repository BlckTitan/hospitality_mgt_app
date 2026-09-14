'use client'

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { Button } from 'react-bootstrap';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

export function FormComponent({
  propertyId,
  shiftDate,
  scheduledEmployeeId,
  staff,
  onClose,
  onSuccess,
}: {
  propertyId: Id<'properties'>;
  shiftDate: string;
  scheduledEmployeeId: string;
  staff: { _id: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const coverDay = useMutation(api.roster.coverRosterDay);
  const [coveringEmployeeId, setCoveringEmployeeId] = useState('');
  const [notes, setNotes] = useState('');

  const onSubmit = async () => {
    if (!coveringEmployeeId) {
      toast.error('Select who will cover');
      return;
    }
    try {
      const result = await coverDay({
        propertyId,
        shiftDate,
        scheduledEmployeeId: scheduledEmployeeId as Id<'staffs'>,
        coveringEmployeeId: coveringEmployeeId as Id<'staffs'>,
        notes: notes || undefined,
      });
      if (result.success === false) toast.error(result.message);
      else {
        toast.success(result.message);
        onSuccess();
      }
    } catch (error) {
      console.error('Assign cover failed:', error);
      toast.error('Failed to assign cover. Please try again.');
    }
  };

  return (
    <div className="createCoverForm">
      <label className="block mb-3">
        <span className="block text-sm mb-1">Covering staff *</span>
        <select className="w-full border rounded p-2" value={coveringEmployeeId} onChange={(e) => setCoveringEmployeeId(e.target.value)}>
          <option value="">Select staff</option>
          {staff.map((row) => (
            <option key={row._id} value={row._id}>{row.firstName} {row.lastName}</option>
          ))}
        </select>
      </label>
      <label className="block mb-4">
        <span className="block text-sm mb-1">Notes</span>
        <input className="w-full border rounded p-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" onClick={onSubmit}>Save cover</Button>
      </div>
    </div>
  );
}
