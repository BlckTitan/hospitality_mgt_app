'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'
import { usePermissions } from '../../../../../hooks/usePermissions'

type PropertyOption = { _id: Id<'properties'>; name: string }

export default function InventoryItems({
  propertyId,
  properties,
  onPropertyChange,
}: {
  propertyId: Id<'properties'> | ''
  properties: PropertyOption[]
  onPropertyChange: (id: string) => void
}) {
  const { hasGranularPermission } = usePermissions()
  const canUpdate = hasGranularPermission('restaurant.update')
  const canChooseProperty = hasGranularPermission('restaurant.read') && properties.length > 1
  const currency = usePropertyCurrency(propertyId || undefined)
  const list = useQuery(
    api.restaurantInventory.listInventoryItems,
    propertyId ? { propertyId } : 'skip',
  )
  const updateItem = useMutation(api.restaurantInventory.updateInventoryItem)
  const rows = useMemo(() => list?.data ?? [], [list?.data])
  const money = (value: number) => formatPropertyMoney(value, currency)

  const handleActive = async (itemId: Id<'restaurantInventoryItems'>, name: string, isActive: boolean) => {
    if (!confirm(`${isActive ? 'Reactivate' : 'Deactivate'} ${name}?`)) return
    try {
      const response = await updateItem({ itemId, isActive })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    } catch (error) {
      console.error('Update ingredient failed:', error)
      toast.error('Failed to update ingredient')
    }
  }

  if (list === undefined && propertyId) return <p className="p-4">Loading</p>

  return (
    <div className="w-full h-full">
      <div className="flex flex-wrap gap-3 mb-4 items-end py-2">
        {canChooseProperty && (
          <label className="flex flex-col text-sm">
            Property
            <select
              className="border rounded px-2 mt-2"
              value={propertyId}
              onChange={(event) => onPropertyChange(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Link href="/admin/restaurant/inventory/movements" className="text-sm underline ms-auto">
          Stock movements
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">SKU</th>
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">On hand</th>
              <th className="p-2">Reorder</th>
              <th className="p-2">Unit cost</th>
              <th className="p-2">Status</th>
              {canUpdate && <th className="p-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={canUpdate ? 8 : 7}>
                  No restaurant ingredients yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const low =
                row.reorderPoint !== undefined && row.currentQuantity <= row.reorderPoint
              return (
                <tr key={row._id} className="border-t">
                  <td className="p-2">{row.sku}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.category}</td>
                  <td className={`p-2 ${low ? 'text-amber-800 font-medium' : ''}`}>
                    {row.currentQuantity} {row.unit}
                  </td>
                  <td className="p-2">{row.reorderPoint ?? '—'}</td>
                  <td className="p-2">{row.unitCost !== undefined ? money(row.unitCost) : '—'}</td>
                  <td className="p-2">{row.isActive ? 'Active' : 'Inactive'}</td>
                  {canUpdate && (
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant={row.isActive ? 'outline-danger' : 'outline-secondary'}
                        onClick={() => void handleActive(row._id, row.name, !row.isActive)}
                      >
                        {row.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
