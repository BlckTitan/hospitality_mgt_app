'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Button } from '../../../../../shared/button';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

export function InventoryCount({ propertyId }: { propertyId: Id<'properties'> }) {
  const locations = useQuery(api.stockLocations.getStockLocations, { propertyId });
  const active = useQuery(api.inventoryCounts.getActiveInventoryCount, { propertyId });
  const history = useQuery(api.inventoryCounts.listInventoryCounts, { propertyId });
  const ensureDefault = useMutation(api.stockLocations.ensureDefaultStockLocation);
  const createLocation = useMutation(api.stockLocations.createStockLocation);
  const startCount = useMutation(api.inventoryCounts.startInventoryCount);
  const saveLines = useMutation(api.inventoryCounts.saveInventoryCountLines);
  const postCount = useMutation(api.inventoryCounts.postInventoryCount);

  const [locationId, setLocationId] = useState('');
  const [newName, setNewName] = useState('');
  const [kind, setKind] = useState<'storeroom' | 'outlet' | 'floor' | 'bar'>('floor');
  const [counted, setCounted] = useState<Record<string, string>>({});

  const count = active?.data ?? null;

  useEffect(() => {
    if (!count?.lines) return;
    const next: Record<string, string> = {};
    for (const line of count.lines) {
      next[line._id] = line.countedQty === undefined || line.countedQty === null ? '' : String(line.countedQty);
    }
    setCounted(next);
  }, [count?._id, count?.lines]);

  const save = async () => {
    if (!count) return;
    const lines = count.lines.map((line) => ({
      lineId: line._id,
      countedQty: Number(counted[line._id]),
    }));
    if (lines.some((line) => !Number.isFinite(line.countedQty))) {
      toast.error('Enter a counted quantity for every item');
      return false;
    }
    const saved = await saveLines({ countId: count._id, lines });
    if (!saved.success) {
      toast.error(saved.message);
      return false;
    }
    toast.success(saved.message);
    return true;
  };

  const post = async () => {
    if (!count) return;
    const saved = await save();
    if (!saved) return;
    const posted = await postCount({ countId: count._id });
    if (!posted.success) toast.error(posted.message);
    else toast.success(posted.message);
  };

  return (
    <div className="space-y-6">
      <section className="border p-3">
        <h2 className="font-medium mb-2">Locations</h2>
        <p className="text-sm text-slate-600 mb-2">
          Stock lives at a location. A transfer moves bottles from the storeroom to a floor. It does not change the property total.
        </p>
        {(locations?.data ?? []).length === 0 && (
          <Button
            size="sm"
            variant="dark"
            onClick={async () => {
              const created = await ensureDefault({ propertyId });
              if (!created.success) toast.error('Could not create the main storeroom');
              else toast.success(`Created ${created.name}`);
            }}
          >
            Create main storeroom
          </Button>
        )}
        <ul className="text-sm mb-3">
          {(locations?.data ?? []).map((location) => (
            <li key={location._id}>{location.name} · {location.kind}{location.isDefault ? ' · default' : ''}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            New location
            <input className="block border rounded px-2 py-1 mt-1" value={newName} onChange={(event) => setNewName(event.target.value)} />
          </label>
          <label className="text-sm">
            Kind
            <select className="block border rounded px-2 py-1 mt-1" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              <option value="storeroom">Storeroom</option>
              <option value="floor">Floor</option>
              <option value="outlet">Outlet</option>
              <option value="bar">Bar</option>
            </select>
          </label>
          <Button
            size="sm"
            variant="outline-dark"
            onClick={async () => {
              const created = await createLocation({ propertyId, name: newName, kind });
              if (!created.success) toast.error(created.message);
              else {
                toast.success(created.message);
                setNewName('');
              }
            }}
          >
            Add location
          </Button>
        </div>
      </section>

      {!count && (
        <section className="border p-3">
          <h2 className="font-medium mb-2">Start a count</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              Location
              <select className="block border rounded px-2 py-1 mt-1 min-w-48" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Select</option>
                {(locations?.data ?? []).map((location) => (
                  <option key={location._id} value={location._id}>{location.name}</option>
                ))}
              </select>
            </label>
            <Button
              variant="dark"
              size="sm"
              onClick={async () => {
                if (!locationId) {
                  toast.error('Choose a location');
                  return;
                }
                const started = await startCount({ propertyId, locationId: locationId as Id<'stockLocations'> });
                if (!started.success) toast.error(started.message);
                else toast.success(started.message);
              }}
            >
              Start count
            </Button>
          </div>
        </section>
      )}

      {count && (
        <section>
          <h2 className="font-medium mb-2">Counting {count.locationName}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="p-2">Item</th>
                  <th className="p-2">Book</th>
                  <th className="p-2">Counted</th>
                </tr>
              </thead>
              <tbody>
                {count.lines.map((line) => (
                  <tr key={line._id} className="border-t">
                    <td className="p-2">{line.itemName}<div className="text-xs text-slate-500">{line.sku}</div></td>
                    <td className="p-2">{line.bookQty} {line.unit}</td>
                    <td className="p-2">
                      <input
                        className="border rounded px-2 py-1 w-24"
                        type="number"
                        min={0}
                        value={counted[line._id] ?? ''}
                        onChange={(event) => setCounted((current) => ({ ...current, [line._id]: event.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline-dark" onClick={save}>Save</Button>
            <Button variant="dark" onClick={post}>Post count</Button>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-medium mb-2">Recent counts</h2>
        <ul className="text-sm">
          {(history?.data ?? []).map((row) => (
            <li key={row._id}>{row.countDateKey} · {row.locationName} · {row.status}</li>
          ))}
          {(history?.data ?? []).length === 0 && <li>No counts yet.</li>}
        </ul>
      </section>
    </div>
  );
}
