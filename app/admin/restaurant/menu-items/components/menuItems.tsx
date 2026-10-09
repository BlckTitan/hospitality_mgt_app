'use client'

import { MdEditDocument } from 'react-icons/md'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'
import { usePermissions } from '../../../../../hooks/usePermissions'

type Station = 'kitchen' | 'grill' | 'other'

const stationClass: Record<Station, string> = {
  kitchen: 'bg-sky-50 text-sky-800',
  grill: 'bg-orange-50 text-orange-800',
  other: 'bg-gray-100 text-gray-700',
}

type PropertyOption = { _id: Id<'properties'>; name: string }

export default function MenuItems({
  propertyId,
  properties,
  onPropertyChange,
}: {
  propertyId: Id<'properties'> | ''
  properties: PropertyOption[]
  onPropertyChange: (id: string) => void
}) {
  const [station, setStation] = useState('')
  const { hasGranularPermission } = usePermissions()
  const canUpdate = hasGranularPermission('restaurant.update')
  const canDeactivate = hasGranularPermission('restaurant.delete')
  const currency = usePropertyCurrency(propertyId || undefined)

  const list = useQuery(
    api.restaurantMenuItems.listMenuItems,
    propertyId
      ? {
          propertyId,
          ...(station ? { station: station as Station } : {}),
          isActive: true,
        }
      : 'skip',
  )
  const deactivateMenuItem = useMutation(api.restaurantMenuItems.deactivateMenuItem)

  const rows = useMemo(() => list?.data ?? [], [list?.data])
  const money = (value: number) => formatPropertyMoney(value, currency)

  const handleDeactivate = async (menuItemId: Id<'restaurantMenuItems'>, name: string) => {
    if (!confirm(`Deactivate ${name}?`)) return
    try {
      const response = await deactivateMenuItem({ menuItemId })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    } catch (error) {
      console.log(`Failed to deactivate menu item! ${error}`)
      toast.error('Failed to deactivate menu item')
    }
  }

  if (list === undefined && propertyId) {
    return <p className="p-4">Loading</p>
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-wrap gap-3 mb-4 items-end py-2">
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
        <label className="flex flex-col text-sm">
          Station
          <select
            className="border rounded px-2 mt-2"
            value={station}
            onChange={(event) => setStation(event.target.value)}
          >
            <option value="">All</option>
            <option value="kitchen">Kitchen</option>
            <option value="grill">Grill</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Station</th>
              <th className="p-2">Price</th>
              <th className="p-2">Cost</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={7}>
                  No menu items found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.category}</td>
                <td className="p-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${stationClass[row.station]}`}>
                    {row.station}
                  </span>
                </td>
                <td className="p-2">{money(row.price)}</td>
                <td className="p-2">{row.cost !== undefined ? money(row.cost) : '—'}</td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded text-white ${row.isAvailable ? 'bg-green-600' : 'bg-red-400'}`}
                  >
                    {row.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <a
                        href={`/admin/restaurant/menu-items/edit?menu_item_id=${row._id}`}
                        className="!no-underline !text-amber-400"
                      >
                        <MdEditDocument />
                      </a>
                    )}
                    {canDeactivate && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeactivate(row._id, row.name)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
