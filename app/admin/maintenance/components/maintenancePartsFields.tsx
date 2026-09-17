'use client';

import { Button } from 'react-bootstrap';
import { Id } from '../../../../convex/_generated/dataModel';
import { Field, fieldRowClassName, fieldWidthClass } from '../../../../shared/field';

export type MaintenancePartDraft = {
  key: string;
  inventoryItemId: string;
  name: string;
  quantity: string;
  unitCost: string;
};

export type PartsCatalogItem = {
  _id: Id<'inventoryItems'>;
  name: string;
  sku: string;
  unit: string;
  unitCost?: number;
};

export function emptyPart(): MaintenancePartDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    inventoryItemId: '',
    name: '',
    quantity: '1',
    unitCost: '',
  };
}

export function partsCostOf(parts: MaintenancePartDraft[]) {
  return parts.reduce((sum, part) => {
    const quantity = Number(part.quantity);
    const unitCost = Number(part.unitCost);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return sum;
    return sum + quantity * unitCost;
  }, 0);
}

export function serializeParts(parts: MaintenancePartDraft[]) {
  return parts
    .map((part) => ({
      inventoryItemId: part.inventoryItemId
        ? (part.inventoryItemId as Id<'inventoryItems'>)
        : undefined,
      name: part.name.trim(),
      quantity: Number(part.quantity),
      unitCost: Number(part.unitCost),
    }))
    .filter((part) => (
      part.name.length > 0
      && Number.isFinite(part.quantity)
      && part.quantity > 0
      && Number.isFinite(part.unitCost)
      && part.unitCost >= 0
    ));
}

export function optionalMoney(value?: number | string | null) {
  if (value === '' || value === undefined || value === null) return undefined;
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return undefined;
  return amount;
}

export function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function MaintenancePartsFields({
  parts,
  onChange,
  catalog,
}: {
  parts: MaintenancePartDraft[];
  onChange: (parts: MaintenancePartDraft[]) => void;
  catalog: PartsCatalogItem[];
}) {
  const updatePart = (key: string, patch: Partial<MaintenancePartDraft>) => {
    onChange(parts.map((part) => (part.key === key ? { ...part, ...patch } : part)));
  };

  return (
    <div className="w-full lg:w-8/12 mb-2 lg:mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="mb-0">Purchased items</label>
        <Button
          type="button"
          variant="outline-dark"
          size="sm"
          onClick={() => onChange([...parts, emptyPart()])}
        >
          Add item
        </Button>
      </div>
      <p className="text-sm text-gray-600 mb-2">
        Record parts bought or taken from inventory for this work. Custom items are allowed if they are not in inventory.
      </p>
      {parts.length === 0 && (
        <p className="text-sm text-gray-500 border rounded p-2">No purchased items yet.</p>
      )}
      <div className="flex flex-col gap-3">
        {parts.map((part, index) => {
          const lineTotal = Number(part.quantity) * Number(part.unitCost);
          return (
            <div key={part.key} className="border rounded-sm p-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Item {index + 1}</span>
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => onChange(parts.filter((row) => row.key !== part.key))}
                >
                  Remove
                </button>
              </div>
              <div className={fieldRowClassName}>
                <Field id={`part-inventory-${part.key}`} label="Inventory item" widthClass={fieldWidthClass('w-1/3')}>
                  <select
                    id={`part-inventory-${part.key}`}
                    className="w-full max-w-full min-w-0"
                    value={part.inventoryItemId}
                    onChange={(event) => {
                      const inventoryItemId = event.target.value;
                      const item = catalog.find((row) => row._id === inventoryItemId);
                      updatePart(part.key, {
                        inventoryItemId,
                        name: item?.name ?? part.name,
                        unitCost: item?.unitCost != null ? String(item.unitCost) : part.unitCost,
                      });
                    }}
                  >
                    <option value="">Custom item</option>
                    {catalog.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`part-name-${part.key}`} label="Name *" widthClass={fieldWidthClass('w-1/3')}>
                  <input
                    id={`part-name-${part.key}`}
                    className="w-full max-w-full min-w-0"
                    value={part.name}
                    onChange={(event) => updatePart(part.key, { name: event.target.value })}
                    placeholder="Pipe fitting, filter, etc."
                  />
                </Field>
              </div>
              <div className={`${fieldRowClassName} !mb-0`}>
                <Field id={`part-qty-${part.key}`} label="Quantity *" widthClass={fieldWidthClass('w-3/12')}>
                  <input
                    id={`part-qty-${part.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full max-w-full min-w-0"
                    value={part.quantity}
                    onChange={(event) => updatePart(part.key, { quantity: event.target.value })}
                  />
                </Field>
                <Field id={`part-cost-${part.key}`} label="Unit cost *" widthClass={fieldWidthClass('w-3/12')}>
                  <input
                    id={`part-cost-${part.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full max-w-full min-w-0"
                    value={part.unitCost}
                    onChange={(event) => updatePart(part.key, { unitCost: event.target.value })}
                  />
                </Field>
                <Field label="Line total" widthClass={fieldWidthClass('w-3/12')}>
                  <p className="w-full max-w-full min-w-0 h-10 p-2 border rounded-sm bg-slate-50 mb-0 flex items-center">
                    {Number.isFinite(lineTotal) ? formatCurrency(lineTotal) : '—'}
                  </p>
                </Field>
              </div>
            </div>
          );
        })}
      </div>
      {parts.length > 0 && (
        <p className="text-sm mt-2 mb-0">
          Items total: <span className="font-semibold">{formatCurrency(partsCostOf(parts))}</span>
        </p>
      )}
    </div>
  );
}
