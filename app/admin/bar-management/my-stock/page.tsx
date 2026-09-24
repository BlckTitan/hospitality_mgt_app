'use client'

import { useMutation, useQuery } from 'convex/react';
import { FormEvent, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { BackLink } from '../../../../shared/pageHeader';

export default function MyStockPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const [propertyId, setPropertyId] = useState<string>('');
  const [barId, setBarId] = useState<string>('');
  const [beverageId, setBeverageId] = useState<string>('');
  const [closingEdits, setClosingEdits] = useState<Record<string, string>>({});
  const [wasteEdits, setWasteEdits] = useState<Record<string, string>>({});
  const [compEdits, setCompEdits] = useState<Record<string, string>>({});

  const currentPropertyId = propertyId || properties[0]?._id || '';
  const today = useQuery(
    api.userStockLogs.getMyTodayStock,
    currentPropertyId ? { propertyId: currentPropertyId as Id<'properties'> } : 'skip',
  );

  const addBeverage = useMutation(api.userStockLogs.addMyTodayBeverage);
  const saveClosing = useMutation(api.userStockLogs.saveMyClosingStock);
  const finalizeToday = useMutation(api.userStockLogs.finalizeMyToday);

  const data = today?.success ? today.data : null;
  const bars = data?.bars ?? [];
  const selectedBarId = barId || bars[0]?._id || '';
  const logs = (data?.logs ?? []).filter((log) => !selectedBarId || log.barId === selectedBarId);

  const availableBeverages = useMemo(() => {
    const used = new Set(logs.map((log) => log.beverageId));
    return (data?.beverages ?? []).filter((beverage) => !used.has(beverage._id));
  }, [data?.beverages, logs]);

  if (!propertiesResponse?.data) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentPropertyId || !selectedBarId || !beverageId) {
      toast.error('Select a bar and beverage');
      return;
    }
    try {
      const response = await addBeverage({
        propertyId: currentPropertyId as Id<'properties'>,
        barId: selectedBarId as Id<'bars'>,
        beverageId: beverageId as Id<'beverages'>,
      });
      if (response.success === false) toast.error(response.message);
      else {
        toast.success(response.message);
        setBeverageId('');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add beverage');
    }
  };

  const handleSave = async (stockLogId: string, fallback: number) => {
    const raw = closingEdits[stockLogId];
    const closingStock = raw === undefined || raw === '' ? fallback : Number(raw);
    if (Number.isNaN(closingStock)) {
      toast.error('Closing stock must be a number');
      return;
    }
    try {
      const wasteRaw = wasteEdits[stockLogId];
      const compRaw = compEdits[stockLogId];
      const wasteQuantity = wasteRaw === undefined || wasteRaw === '' ? undefined : Number(wasteRaw);
      const compQuantity = compRaw === undefined || compRaw === '' ? undefined : Number(compRaw);
      if ((wasteQuantity !== undefined && Number.isNaN(wasteQuantity)) || (compQuantity !== undefined && Number.isNaN(compQuantity))) {
        toast.error('Waste and comps must be numbers');
        return;
      }
      const response = await saveClosing({
        stockLogId: stockLogId as Id<'userStockLogs'>,
        closingStock,
        wasteQuantity,
        compQuantity,
      });
      if (response.success === false) toast.error(response.message);
      else toast.success(response.message);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save closing stock');
    }
  };

  const handleFinalize = async () => {
    if (!selectedBarId) {
      toast.error('Select a bar first');
      return;
    }
    if (!confirm('Finalize today for this bar? Issued stock cannot be added afterwards.')) return;
    try {
      const response = await finalizeToday({
        propertyId: currentPropertyId as Id<'properties'>,
        barId: selectedBarId as Id<'bars'>,
      });
      if (response.success === false) toast.error(response.message);
      else toast.success(response.message);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to finalize today');
    }
  };

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <div>
          <h3>My stock today</h3>
          <p className="text-sm text-gray-600">Record closing counts for beverages issued to you today.</p>
        </div>
        <BackLink />
      </header>

      {properties.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm mb-1">Property</label>
          <select
            className="border rounded p-2"
            value={currentPropertyId}
            onChange={(event) => {
              setPropertyId(event.target.value);
              setBarId('');
            }}
          >
            {properties.map((property: any) => (
              <option key={property._id} value={property._id}>{property.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm mb-1">Bar</label>
        <select
          className="border rounded p-2"
          value={selectedBarId}
          onChange={(event) => setBarId(event.target.value)}
        >
          <option value="">Select a bar</option>
          {bars.map((bar) => (
            <option key={bar._id} value={bar._id}>{bar.name}</option>
          ))}
        </select>
        {data?.logDate && (
          <p className="text-sm text-gray-500 mt-1">Date: {data.logDate}</p>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-2 mb-6 items-end">
        <div className="flex-1">
          <label className="block text-sm mb-1">Add beverage</label>
          <select
            className="w-full border rounded p-2"
            value={beverageId}
            onChange={(event) => setBeverageId(event.target.value)}
          >
            <option value="">Select a beverage</option>
            {availableBeverages.map((beverage) => (
              <option key={beverage._id} value={beverage._id}>
                {beverage.name}
              </option>
            ))}
          </select>
        </div>
        <Button variant="dark" type="submit" disabled={!selectedBarId}>Add to today</Button>
      </form>

      {logs.length === 0 ? (
        <p className="text-gray-600">No beverages on today&apos;s log yet. Add a carry-over beverage or wait for a store issue.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left text-sm">Beverage</th>
                <th className="p-2 text-left text-sm">Opening</th>
                <th className="p-2 text-left text-sm">Received</th>
                <th className="p-2 text-left text-sm">Total</th>
                <th className="p-2 text-left text-sm">Closing</th>
                <th className="p-2 text-left text-sm">Waste</th>
                <th className="p-2 text-left text-sm">Comps</th>
                <th className="p-2 text-left text-sm">Sales</th>
                <th className="p-2 text-left text-sm">Status</th>
                <th className="p-2 text-left text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const closingValue = closingEdits[log._id] ?? String(log.closingStock);
                const wasteValue = wasteEdits[log._id] ?? String(log.wasteQuantity ?? 0);
                const compValue = compEdits[log._id] ?? String(log.compQuantity ?? 0);
                const closingNumber = Number(closingValue);
                const wasteNumber = Number(wasteValue);
                const compNumber = Number(compValue);
                const disappeared = Number.isNaN(closingNumber) ? (log.salesQuantity + (log.wasteQuantity ?? 0) + (log.compQuantity ?? 0)) : log.totalStock - closingNumber;
                const sales = disappeared - (Number.isNaN(wasteNumber) ? 0 : wasteNumber) - (Number.isNaN(compNumber) ? 0 : compNumber);
                return (
                  <tr key={log._id} className="border-t">
                    <td className="p-2">{log.beverage?.name || 'Unknown'}</td>
                    <td className="p-2">{log.openingStock}</td>
                    <td className="p-2">{log.newStockReceived}</td>
                    <td className="p-2 font-semibold">{log.totalStock}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        className="w-24 border rounded p-1"
                        value={closingValue}
                        disabled={log.isFinalized}
                        onChange={(event) =>
                          setClosingEdits((current) => ({ ...current, [log._id]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        className="w-20 border rounded p-1"
                        value={wasteValue}
                        disabled={log.isFinalized}
                        onChange={(event) =>
                          setWasteEdits((current) => ({ ...current, [log._id]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        className="w-20 border rounded p-1"
                        value={compValue}
                        disabled={log.isFinalized}
                        onChange={(event) =>
                          setCompEdits((current) => ({ ...current, [log._id]: event.target.value }))
                        }
                      />
                    </td>
                    <td className={`p-2 ${sales < 0 ? 'text-red-600' : ''}`}>{sales}</td>
                    <td className="p-2">{log.isFinalized ? 'Finalized' : 'Open'}</td>
                    <td className="p-2">
                      {!log.isFinalized && (
                        <Button
                          size="sm"
                          variant="dark"
                          disabled={sales < 0}
                          onClick={() => handleSave(log._id, log.closingStock)}
                        >
                          Save
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {logs.length > 0 && logs.some((log) => !log.isFinalized) && (
        <div className="mt-4">
          <Button variant="success" onClick={handleFinalize}>Finalize today</Button>
        </div>
      )}
    </div>
  );
}
