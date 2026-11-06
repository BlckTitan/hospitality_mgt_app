'use client';

import { Field } from '../../../../shared/field';
import { formatPropertyMoney } from '../../inventory-management/components/money';
import type { CratePurchase } from '../../../../lib/crateCost';

export type SupplyCostDraft = { key: string; label: string; amount: string };

const alignedLabel = 'mb-1 flex w-full min-h-12 items-end leading-snug';
const alignedField = 'min-w-0 flex-1';

export function blankSupplyCosts(): SupplyCostDraft[] {
  return [{ key: 'transportation', label: 'Transportation', amount: '' }];
}

export function supplyCostDrafts(lines: { label: string; amount: number }[] | undefined): SupplyCostDraft[] {
  if (!lines?.length) return blankSupplyCosts();
  return lines.map((line, index) => ({
    key: `${index}-${line.label}`,
    label: line.label,
    amount: String(line.amount),
  }));
}

export function supplyCostsFromDrafts(lines: SupplyCostDraft[]) {
  return lines.map((line) => ({
    label: line.label,
    amount: line.amount.trim() === '' ? Number.NaN : Number(line.amount),
  }));
}

export function CratePurchaseFields({
  register,
  errors,
  currency,
  unitsPerPackLocked,
  supplyCosts,
  onSupplyCostsChange,
  preview,
  crateLabel,
}: {
  register: any;
  errors: any;
  currency?: string;
  unitsPerPackLocked: boolean;
  supplyCosts: SupplyCostDraft[];
  onSupplyCostsChange: (lines: SupplyCostDraft[]) => void;
  preview: CratePurchase | null;
  crateLabel: string;
}) {
  const updateLine = (key: string, patch: Partial<SupplyCostDraft>) => {
    onSupplyCostsChange(supplyCosts.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  return (
    <>
      <div className="mb-4 flex w-full flex-nowrap flex-row items-start gap-3">
        <Field id="packQty" label={crateLabel} widthClass={alignedField} labelClassName={alignedLabel}>
          <input id="packQty" type="number" min={0} step="any" {...register('packQty', { valueAsNumber: true })} />
          {errors.packQty && <span className="text-red-500 text-sm">{errors.packQty.message}</span>}
        </Field>
        <Field id="packPrice" label="Price per crate" widthClass={alignedField} labelClassName={alignedLabel}>
          <input id="packPrice" type="number" min={0} step="any" {...register('packPrice', { valueAsNumber: true })} />
          {errors.packPrice && <span className="text-red-500 text-sm">{errors.packPrice.message}</span>}
        </Field>
        <Field id="unitsPerPack" label="Bottles per crate" widthClass={alignedField} labelClassName={alignedLabel}>
          <input
            id="unitsPerPack"
            type="number"
            min={1}
            step={1}
            readOnly={unitsPerPackLocked}
            className={unitsPerPackLocked ? 'bg-gray-100' : undefined}
            {...register('unitsPerPack', { valueAsNumber: true })}
          />
          {errors.unitsPerPack && <span className="text-red-500 text-sm">{errors.unitsPerPack.message}</span>}
        </Field>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Supply costs</span>
          <button
            type="button"
            className="text-sm text-blue-700"
            disabled={supplyCosts.length >= 8}
            onClick={() =>
              onSupplyCostsChange([
                ...supplyCosts,
                { key: `${Date.now()}-${supplyCosts.length}`, label: '', amount: '' },
              ])
            }
          >
            Add supply cost
          </button>
        </div>
        <div className="space-y-3">
          {supplyCosts.map((line) => (
            <div key={line.key} className="flex flex-nowrap items-start gap-3">
              <Field
                id={`supply-name-${line.key}`}
                label="Name"
                widthClass={alignedField}
                labelClassName={alignedLabel}
              >
                <input
                  id={`supply-name-${line.key}`}
                  value={line.label}
                  placeholder="Transportation"
                  onChange={(event) => updateLine(line.key, { label: event.target.value })}
                />
              </Field>
              <Field
                id={`supply-amount-${line.key}`}
                label="Amount"
                widthClass={alignedField}
                labelClassName={alignedLabel}
              >
                <input
                  id={`supply-amount-${line.key}`}
                  type="number"
                  min={0}
                  step="any"
                  value={line.amount}
                  placeholder="0"
                  onChange={(event) => updateLine(line.key, { amount: event.target.value })}
                />
              </Field>
              <button
                type="button"
                className="mt-12 shrink-0 px-2 py-2 text-sm text-gray-500"
                onClick={() => onSupplyCostsChange(supplyCosts.filter((row) => row.key !== line.key))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Transportation and other costs of getting the drink in are added once for this receipt. Leave an amount blank to skip that row.
        </p>
      </div>

      <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        {preview ? (
          <div className="space-y-1">
            <div>{preview.qty} bottles</div>
            <div>Crates {formatPropertyMoney(preview.goodsCost, currency)}</div>
            <div>Supply {formatPropertyMoney(preview.supplyTotal, currency)}</div>
            <div>Landed total {formatPropertyMoney(preview.totalCost, currency)}</div>
            <div className="font-medium">Bottle cost {formatPropertyMoney(preview.unitCost, currency)}</div>
          </div>
        ) : (
          <p>Bottle cost appears here once the crate price and bottles per crate are filled in.</p>
        )}
      </div>
    </>
  );
}
