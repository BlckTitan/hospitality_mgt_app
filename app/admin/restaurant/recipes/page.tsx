'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { BackLink } from '../../../../shared/pageHeader'
import { Button } from '../../../../shared/button'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../inventory-management/components/money'
import { RestaurantPageGuide } from '../components/restaurantPageGuide'

type LineDraft = {
  key: string
  inventoryItemId: string
  quantity: string
  unit: string
  wastePercent: string
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

export default function RecipesPage() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const [selectedId, setSelectedId] = useState<Id<'recipes'> | null>(null)
  const [upsertOpen, setUpsertOpen] = useState(false)
  const [menuItemId, setMenuItemId] = useState('')
  const [recipeName, setRecipeName] = useState('')
  const [servings, setServings] = useState('1')
  const [instructions, setInstructions] = useState('')
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([newLineDraft()])
  const [busy, setBusy] = useState(false)

  const recipes = useQuery(
    api.recipes.listRecipes,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )
  const recipeList = recipes?.data ?? []

  useEffect(() => {
    if (!selectedId && recipeList[0]?._id) {
      setSelectedId(recipeList[0]._id)
    }
  }, [recipeList, selectedId])

  const detail = useQuery(api.recipes.getRecipe, selectedId ? { recipeId: selectedId } : 'skip')
  const menuItems = useQuery(
    api.restaurantMenuItems.listMenuItems,
    currentPropertyId ? { propertyId: currentPropertyId, isActive: true } : 'skip',
  )
  const inventory = useQuery(
    api.recipes.listInventoryForRecipes,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )

  const upsertRecipe = useMutation(api.recipes.upsertRecipeForMenuItem)
  const replaceRecipeLines = useMutation(api.recipes.replaceRecipeLines)
  const recalculateRecipe = useMutation(api.recipes.recalculateRecipe)

  const inventoryRows = useMemo(
    () => (inventory?.data ?? []).filter((item) => item.isActive),
    [inventory?.data],
  )

  const money = (n: number) => formatPropertyMoney(n, currency)
  const selected = detail?.success ? detail.data : null

  useEffect(() => {
    if (!selected) return
    setLineDrafts(
      selected.lines.length > 0
        ? selected.lines.map((line) => ({
            key: line._id,
            inventoryItemId: line.inventoryItemId,
            quantity: String(line.quantity),
            unit: line.unit,
            wastePercent: String(line.wastePercent ?? 0),
          }))
        : [newLineDraft()],
    )
  }, [selected?._id, selected?.updatedAt])

  const openUpsert = () => {
    setMenuItemId('')
    setRecipeName('')
    setServings('1')
    setInstructions('')
    setUpsertOpen(true)
  }

  const handleUpsert = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPropertyId || !menuItemId) {
      toast.error('Select a menu item')
      return
    }
    const servingsNum = Number(servings)
    if (!recipeName.trim() || Number.isNaN(servingsNum) || servingsNum <= 0) {
      toast.error('Enter a name and servings > 0')
      return
    }
    setBusy(true)
    try {
      const response = await upsertRecipe({
        propertyId: currentPropertyId,
        menuItemId: menuItemId as Id<'restaurantMenuItems'>,
        name: recipeName,
        servings: servingsNum,
        instructions: instructions.trim() || undefined,
      })
      if (!response.success || !response.data?.recipeId) {
        toast.error(response.message)
        return
      }
      toast.success(response.message)
      setSelectedId(response.data.recipeId)
      setUpsertOpen(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Upsert failed')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveLines = async () => {
    if (!selectedId) return
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
      const response = await replaceRecipeLines({ recipeId: selectedId, lines })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Save lines failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRecalculate = async () => {
    if (!selectedId) return
    setBusy(true)
    try {
      const response = await recalculateRecipe({ recipeId: selectedId })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Recalculate failed')
    } finally {
      setBusy(false)
    }
  }

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Recipes</h1>
          <RestaurantPageGuide page="recipes" />
        </div>
        <div className="flex items-center gap-3">
          <BackLink />
          <Button variant="dark" size="sm" onClick={openUpsert}>
            Upsert recipe
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <label className="text-sm">
          Property
          <select
            className="block mt-1 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={currentPropertyId}
            onChange={(e) => {
              setPropertyId(e.target.value)
              setSelectedId(null)
            }}
          >
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
            Recipes
          </div>
          <ul>
            {recipes === undefined && (
              <li className="px-3 py-4 text-sm text-gray-500">Loading…</li>
            )}
            {recipes !== undefined && recipeList.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-500">No recipes yet.</li>
            )}
            {recipeList.map((recipe) => (
              <li key={recipe._id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(recipe._id)}
                  className={`w-full text-left px-3 py-3 border-t border-gray-100 text-sm ${
                    selectedId === recipe._id ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">
                    {recipe.menuItem?.name ?? recipe.name}
                  </div>
                  <div className={selectedId === recipe._id ? 'text-gray-300' : 'text-gray-500'}>
                    Cost{' '}
                    {recipe.totalCost !== undefined ? money(recipe.totalCost) : '—'} /{' '}
                    {recipe.servings} serving
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2 border border-gray-200 rounded-md p-4">
          {detail === undefined && selectedId && (
            <p className="text-sm text-gray-500">Loading recipe…</p>
          )}
          {!selectedId && <p className="text-sm text-gray-500">Select or create a recipe.</p>}
          {selected && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selected.menuItem?.name ?? selected.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selected.name} · {selected.servings} serving(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase">Total cost</p>
                  <p className="text-2xl font-semibold">
                    {selected.totalCost !== undefined ? money(selected.totalCost) : '—'}
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
                        onChange={(e) => {
                          const inventoryItemId = e.target.value
                          const item = inventoryRows.find((row) => row._id === inventoryItemId)
                          setLineDrafts((prev) =>
                            prev.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    inventoryItemId,
                                    unit: item?.unit ?? row.unit,
                                  }
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
                        onChange={(e) =>
                          setLineDrafts((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, quantity: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="text-xs sm:col-span-2">
                      Unit
                      <input
                        className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                        value={draft.unit}
                        onChange={(e) =>
                          setLineDrafts((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, unit: e.target.value } : row,
                            ),
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
                        onChange={(e) =>
                          setLineDrafts((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, wastePercent: e.target.value } : row,
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
                        onClick={() =>
                          setLineDrafts((prev) => prev.filter((_, i) => i !== index))
                        }
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

              {inventory === undefined && (
                <p className="text-xs text-amber-700 mt-3">Loading inventory…</p>
              )}
              {inventory?.success === false && (
                <p className="text-xs text-amber-700 mt-3">
                  Add active inventory items under Inventory Management to use as recipe ingredients.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {upsertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => void handleUpsert(e)}
            className="w-full max-w-md rounded-md bg-white p-4 shadow-lg space-y-3"
          >
            <h2 className="text-lg font-semibold">Upsert recipe for menu item</h2>
            <label className="block text-sm">
              Menu item
              <select
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={menuItemId}
                onChange={(e) => {
                  setMenuItemId(e.target.value)
                  const item = (menuItems?.data ?? []).find((row) => row._id === e.target.value)
                  if (item && !recipeName) setRecipeName(item.name)
                }}
                required
              >
                <option value="">Select…</option>
                {(menuItems?.data ?? []).map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Recipe name
              <input
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Servings
              <input
                type="number"
                min={0.01}
                step="any"
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Instructions (optional)
              <textarea
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="light" onClick={() => setUpsertOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="dark" disabled={busy}>
                Save recipe
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
