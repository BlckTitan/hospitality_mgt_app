'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'

type LineDraft = {
  key: string
  inventoryItemId: string
  quantity: string
  unit: string
  wastePercent: string
}

type LineProp = {
  _id: string
  inventoryItemId: string
  quantity: number
  unit: string
  wastePercent?: number
}

function newLineDraft(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    inventoryItemId: '',
    quantity: '1',
    unit: '',
    wastePercent: '0',
  }
}

export function FormComponent(props: {
  id: Id<'recipes'>
  propertyId: Id<'properties'>
  name: string
  servings: number
  menuItemName?: string
  totalCost?: number
  updatedAt: number
  lines: LineProp[]
}) {
  const currency = usePropertyCurrency(props.propertyId)
  const inventory = useQuery(api.recipes.listInventoryForRecipes, { propertyId: props.propertyId })
  const replaceRecipeLines = useMutation(api.recipes.replaceRecipeLines)
  const recalculateRecipe = useMutation(api.recipes.recalculateRecipe)
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([newLineDraft()])
  const [busy, setBusy] = useState(false)

  const inventoryRows = useMemo(
    () => (inventory?.data ?? []).filter((item) => item.isActive),
    [inventory?.data],
  )
  const money = (value: number) => formatPropertyMoney(value, currency)

  useEffect(() => {
    setLineDrafts(
      props.lines.length > 0
        ? props.lines.map((line) => ({
            key: line._id,
            inventoryItemId: line.inventoryItemId,
            quantity: String(line.quantity),
            unit: line.unit,
            wastePercent: String(line.wastePercent ?? 0),
          }))
        : [newLineDraft()],
    )
    // Reset drafts when the saved recipe changes, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, props.updatedAt])

  const handleSaveLines = async () => {
    const lines = []
    for (const draft of lineDrafts) {
      if (!draft.inventoryItemId) {
        toast.error('Select an inventory item for each line')
        return
      }
      const quantity = Number(draft.quantity)
      const wastePercent = Number(draft.wastePercent || 0)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error('Quantity must be greater than 0')
        return
      }
      if (!draft.unit.trim()) {
        toast.error('Unit is required')
        return
      }
      lines.push({
        inventoryItemId: draft.inventoryItemId as Id<'inventoryItems'>,
        quantity,
        unit: draft.unit.trim(),
        wastePercent: Number.isFinite(wastePercent) ? wastePercent : 0,
      })
    }
    setBusy(true)
    try {
      const response = await replaceRecipeLines({ recipeId: props.id, lines })
      if (response.success) {
        toast.success(response.message)
        setTimeout(() => {
          window.location.href = '/admin/restaurant/recipes'
        }, 1500)
      } else toast.error(response.message)
    } catch (error) {
      console.error('Save recipe lines failed:', error)
      toast.error('Failed to save recipe lines. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleRecalculate = async () => {
    setBusy(true)
    try {
      const response = await recalculateRecipe({ recipeId: props.id })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    } catch (error) {
      console.error('Recalculate recipe failed:', error)
      toast.error('Failed to recalculate recipe. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="editRecipeForm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{props.menuItemName ?? props.name}</h2>
          <p className="text-sm text-gray-600">
            {props.name} · {props.servings} serving(s)
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase">Total cost</p>
          <p className="text-2xl font-semibold">
            {props.totalCost !== undefined ? money(props.totalCost) : '—'}
          </p>
          <Button
            size="sm"
            variant="outline-secondary"
            className="mt-2"
            disabled={busy}
            onClick={() => void handleRecalculate()}
          >
            Recalculate
          </Button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {lineDrafts.map((draft, index) => (
          <div
            key={draft.key}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border border-gray-100 rounded-md p-2"
          >
            <label className="text-xs sm:col-span-5">
              Ingredient
              <select
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={draft.inventoryItemId}
                onChange={(event) => {
                  const inventoryItemId = event.target.value
                  const item = inventoryRows.find((row) => row._id === inventoryItemId)
                  setLineDrafts((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, inventoryItemId, unit: item?.unit ?? row.unit }
                        : row,
                    ),
                  )
                }}
              >
                <option value="">Select item</option>
                {inventoryRows.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                    {item.unitCost !== undefined ? ` · ${money(item.unitCost)}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs sm:col-span-2">
              Qty
              <input
                type="number"
                min={0}
                step="any"
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={draft.quantity}
                onChange={(event) =>
                  setLineDrafts((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, quantity: event.target.value } : row)),
                  )
                }
              />
            </label>
            <label className="text-xs sm:col-span-2">
              Unit
              <input
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={draft.unit}
                onChange={(event) =>
                  setLineDrafts((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, unit: event.target.value } : row)),
                  )
                }
              />
            </label>
            <label className="text-xs sm:col-span-2">
              Waste %
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={draft.wastePercent}
                onChange={(event) =>
                  setLineDrafts((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, wastePercent: event.target.value } : row,
                    ),
                  )
                }
              />
            </label>
            <div className="sm:col-span-1">
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                disabled={lineDrafts.length <= 1}
                onClick={() => setLineDrafts((prev) => prev.filter((_, i) => i !== index))}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={() => setLineDrafts((prev) => [...prev, newLineDraft()])}
        >
          Add line
        </Button>
        <Button size="sm" variant="dark" disabled={busy} onClick={() => void handleSaveLines()}>
          Save lines
        </Button>
      </div>

      {inventory === undefined && <p className="text-xs text-amber-700 mt-3">Loading inventory…</p>}
      {inventory?.success === false && (
        <p className="text-xs text-amber-700 mt-3">
          Add active inventory items under Inventory Management to use as recipe ingredients.
        </p>
      )}
    </div>
  )
}
