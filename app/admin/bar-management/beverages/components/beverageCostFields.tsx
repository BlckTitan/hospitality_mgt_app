'use client'

import { Id } from '../../../../../convex/_generated/dataModel';

export type RecipeLineDraft = {
  key: string;
  inventoryItemId: string;
  quantity: string;
  wastePercent: string;
};

export type CostCatalogItem = {
  _id: Id<'inventoryItems'>;
  name: string;
  sku: string;
  unit: string;
  unitCost?: number;
};

export function newRecipeLine(): RecipeLineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    inventoryItemId: '',
    quantity: '1',
    wastePercent: '',
  };
}

export function recipeLinesPayload(lines: RecipeLineDraft[]) {
  return lines
    .filter((line) => line.inventoryItemId)
    .map((line) => ({
      inventoryItemId: line.inventoryItemId as Id<'inventoryItems'>,
      quantity: Number(line.quantity),
      ...(Number.isFinite(Number(line.wastePercent)) && line.wastePercent !== ''
        ? { wastePercent: Number(line.wastePercent) }
        : {}),
    }));
}

export function BeverageCostFields({
  catalog,
  inventoryItemId,
  onInventoryItemIdChange,
  recipeLines,
  onRecipeLinesChange,
}: {
  catalog: CostCatalogItem[];
  inventoryItemId: string;
  onInventoryItemIdChange: (value: string) => void;
  recipeLines: RecipeLineDraft[];
  onRecipeLinesChange: (lines: RecipeLineDraft[]) => void;
}) {
  const updateLine = (key: string, patch: Partial<RecipeLineDraft>) => {
    onRecipeLinesChange(recipeLines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  return (
    <div className="w-full mb-4 space-y-4">
      <label className="w-full block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Inventory item</span>
        <select
          value={inventoryItemId}
          onChange={(event) => onInventoryItemIdChange(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">None — use manual unit cost or a recipe</option>
          {catalog.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name} ({item.sku}) {item.unitCost != null ? `· ${item.unitCost}/${item.unit}` : ''}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 mt-1 block">
          Link a packaged SKU so purchase cost flows into bar profit. Recipe lines below override this for cocktails.
        </span>
      </label>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Recipe ingredients</span>
          <button
            type="button"
            className="text-sm text-blue-700"
            onClick={() => onRecipeLinesChange([...recipeLines, newRecipeLine()])}
          >
            Add ingredient
          </button>
        </div>
        {recipeLines.length === 0 ? (
          <p className="text-xs text-gray-500">Optional. Add lines for cocktails that consume more than one inventory item.</p>
        ) : (
          <div className="space-y-2">
            {recipeLines.map((line) => (
              <div key={line.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <label className="md:col-span-6">
                  <span className="block text-xs text-gray-600 mb-1">Item</span>
                  <select
                    value={line.inventoryItemId}
                    onChange={(event) => updateLine(line.key, { inventoryItemId: event.target.value })}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select item</option>
                    {catalog.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="md:col-span-2">
                  <span className="block text-xs text-gray-600 mb-1">Qty / drink</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </label>
                <label className="md:col-span-2">
                  <span className="block text-xs text-gray-600 mb-1">Waste %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={line.wastePercent}
                    onChange={(event) => updateLine(line.key, { wastePercent: event.target.value })}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </label>
                <button
                  type="button"
                  className="md:col-span-2 text-sm text-red-600 py-2"
                  onClick={() => onRecipeLinesChange(recipeLines.filter((row) => row.key !== line.key))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
