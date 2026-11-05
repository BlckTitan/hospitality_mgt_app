'use client';

import { FormEvent, useState } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Button } from '../../../../../shared/button';
import BootstrapModal from '../../../../../shared/modal';

export function BarSetupActions({
  barId,
  propertyId,
  barName,
}: {
  barId: Id<'bars'>;
  propertyId: Id<'properties'>;
  barName: string;
}) {
  const [mode, setMode] = useState<'people' | 'stock' | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const operators = useQuery(
    api.bars.listBarOperators,
    isAuthenticated && mode === 'people' ? { barId } : 'skip',
  );
  const choices = useQuery(
    api.bars.listBarOperatorChoices,
    isAuthenticated && mode === 'people' ? { propertyId } : 'skip',
  );
  const beverages = useQuery(
    api.beverages.getAllBeverages,
    isAuthenticated && mode === 'stock' ? { propertyId } : 'skip',
  );
  const assign = useMutation(api.bars.assignBarOperator);
  const unassign = useMutation(api.bars.unassignBarOperator);
  const setOpening = useMutation(api.bars.setBarOpeningStock);
  const [userId, setUserId] = useState('');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const linked = new Set((operators?.data ?? []).map((row) => row.userId));
  const available = (choices?.data ?? []).filter((person) => !linked.has(person._id));

  const linkPerson = async () => {
    if (!userId) {
      toast.error('Choose a waiter or bartender');
      return;
    }
    setBusy(true);
    try {
      const response = await assign({ barId, userId: userId as Id<'users'> });
      if (response.success) {
        toast.success(response.message);
        setUserId('');
      } else toast.error(response.message);
    } catch (error: any) {
      toast.error(error?.message || 'Could not link this person');
    } finally {
      setBusy(false);
    }
  };

  const removePerson = async (assignmentId: Id<'barAssignments'>, name: string) => {
    if (!confirm(`Remove ${name} from ${barName}? The bar stock stays.`)) return;
    setBusy(true);
    try {
      const response = await unassign({ assignmentId });
      if (response.success) toast.success(response.message);
      else toast.error(response.message);
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove this person');
    } finally {
      setBusy(false);
    }
  };

  const saveStock = async (event: FormEvent) => {
    event.preventDefault();
    const lines = Object.entries(qty)
      .filter(([, value]) => value.trim() !== '')
      .map(([beverageId, value]) => ({
        beverageId: beverageId as Id<'beverages'>,
        quantity: Number(value),
      }));
    if (lines.length === 0) {
      toast.error('Enter a quantity for at least one drink');
      return;
    }
    setBusy(true);
    try {
      const response = await setOpening({ barId, lines });
      if (response.success) {
        toast.success(response.message);
        setMode(null);
      } else toast.error(response.message);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save opening stock');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="white" title="Link staff" onClick={() => setMode('people')}>
        Staff
      </Button>
      <Button variant="white" title="Opening stock" onClick={() => setMode('stock')}>
        Stock
      </Button>
      <BootstrapModal
        show={mode === 'people'}
        onHide={() => setMode(null)}
        backdrop="static"
        keyboard={false}
        heading={`Who operates ${barName}`}
        body={
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Linked people sell and count this bar. Removing someone does not move the stock.
            </p>
            <div className="flex gap-2">
              <select
                className="border rounded p-2 flex-1"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              >
                <option value="">Choose a waiter or bartender</option>
                {available.map((person) => (
                  <option key={person._id} value={person._id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <Button type="button" disabled={busy} onClick={linkPerson}>
                Link
              </Button>
            </div>
            <ul className="text-sm">
              {(operators?.data ?? []).map((row) => (
                <li key={row._id} className="flex justify-between py-1 border-b">
                  <span>{row.name}</span>
                  <button
                    type="button"
                    className="text-red-600"
                    disabled={busy}
                    onClick={() => removePerson(row._id, row.name)}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {operators && operators.data.length === 0 && <li>No one is linked yet.</li>}
            </ul>
          </div>
        }
      />
      <BootstrapModal
        show={mode === 'stock'}
        onHide={() => setMode(null)}
        backdrop="static"
        keyboard={false}
        heading={`Opening stock for ${barName}`}
        body={
          <form onSubmit={saveStock} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Enter what is already at this bar. Assigned staff continue from these figures.
            </p>
            <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
              {(beverages?.data ?? [])
                .filter((row) => row.isActive)
                .map((row) => (
                  <label key={row._id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{row.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="border rounded p-1 w-24 text-right"
                      value={qty[row._id] ?? ''}
                      onChange={(event) =>
                        setQty((current) => ({ ...current, [row._id]: event.target.value }))
                      }
                    />
                  </label>
                ))}
            </div>
            <Button type="submit" disabled={busy}>
              Save opening stock
            </Button>
          </form>
        }
      />
    </>
  );
}
