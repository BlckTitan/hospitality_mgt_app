'use client'

import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { BackLink } from '../../../../../shared/pageHeader'
import { Button } from '../../../../../shared/button'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { RestaurantPageGuide } from '../../components/restaurantPageGuide'
import { usePermissions } from '../../../../../hooks/usePermissions'

type StockType = 'receive' | 'usage' | 'adjustment' | 'waste'

export default function Page() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const { hasGranularPermission } = usePermissions()
  const canUpdate = hasGranularPermission('restaurant.update')

  const items = useQuery(
    api.restaurantInventory.listInventoryItems,
    currentPropertyId ? { propertyId: currentPropertyId, isActive: true } : 'skip',
  )
  const movements = useQuery(
    api.restaurantInventory.listTransactions,
    currentPropertyId ? { propertyId: currentPropertyId, limit: 40 } : 'skip',
  )
  const recordMovement = useMutation(api.restaurantInventory.recordMovement)

  const [itemId, setItemId] = useState('')
  const [transactionType, setTransactionType] = useState<StockType>('receive')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!itemId) {
      toast.error('Select an ingredient')
      return
    }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty === 0) {
      toast.error('Enter a non-zero quantity')
      return
    }
    const cost = unitCost === '' ? undefined : Number(unitCost)
    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
      toast.error('Unit cost must be 0 or more')
      return
    }
    setBusy(true)
    try {
      const response = await recordMovement({
        itemId: itemId as Id<'restaurantInventoryItems'>,
        transactionType,
        quantity: qty,
        unitCost: transactionType === 'receive' ? cost : undefined,
        reason: reason.trim() || undefined,
      })
      if (response.success) {
        toast.success(response.message)
        setQuantity('')
        setReason('')
      } else toast.error(response.message)
    } catch (error) {
      console.error('Record restaurant stock movement failed:', error)
      toast.error('Failed to record movement')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant stock movements</h1>
          <RestaurantPageGuide page="inventory-movements" />
        </div>
        <BackLink />
      </header>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <label className="flex flex-col text-sm">
          Property
          <select
            className="border rounded px-2 mt-2"
            value={currentPropertyId}
            onChange={(event) => {
              setPropertyId(event.target.value)
              setItemId('')
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

      {canUpdate && (
        <form onSubmit={(event) => void handleSubmit(event)} className="border rounded-md p-3 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <label className="text-sm md:col-span-2">
            Ingredient
            <select
              className="w-full border rounded px-2 py-2 mt-1 text-sm"
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
            >
              <option value="">Select</option>
              {(items?.data ?? []).map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} · {item.currentQuantity} {item.unit}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Type
            <select
              className="w-full border rounded px-2 py-2 mt-1 text-sm"
              value={transactionType}
              onChange={(event) => setTransactionType(event.target.value as StockType)}
            >
              <option value="receive">Receive</option>
              <option value="usage">Usage</option>
              <option value="waste">Waste</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </label>
          <label className="text-sm">
            Quantity
            <input
              className="w-full border rounded px-2 py-2 mt-1 text-sm"
              type="number"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          {transactionType === 'receive' && (
            <label className="text-sm">
              Unit cost
              <input
                className="w-full border rounded px-2 py-2 mt-1 text-sm"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
              />
            </label>
          )}
          <label className="text-sm md:col-span-2">
            Reason
            <input
              className="w-full border rounded px-2 py-2 mt-1 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <Button type="submit" variant="dark" disabled={busy}>
            Record
          </Button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">When</th>
              <th className="p-2">Ingredient</th>
              <th className="p-2">Type</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {movements === undefined && (
              <tr>
                <td className="p-3" colSpan={5}>
                  Loading
                </td>
              </tr>
            )}
            {movements !== undefined && (movements.data ?? []).length === 0 && (
              <tr>
                <td className="p-3" colSpan={5}>
                  No movements yet.
                </td>
              </tr>
            )}
            {(movements?.data ?? []).map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2 whitespace-nowrap">{new Date(row.transactionDate).toLocaleString()}</td>
                <td className="p-2">{row.itemName}</td>
                <td className="p-2 capitalize">{row.transactionType}</td>
                <td className="p-2">
                  {row.quantity} {row.unit}
                </td>
                <td className="p-2">{row.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
