'use client'

import { MdEditDocument } from 'react-icons/md'
import { FcDocument } from 'react-icons/fc'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'
import { usePermissions } from '../../../../../hooks/usePermissions'

type PropertyOption = { _id: Id<'properties'>; name: string }

export default function Recipes({
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
  const currency = usePropertyCurrency(propertyId || undefined)
  const recipes = useQuery(
    api.recipes.listRecipes,
    propertyId ? { propertyId } : 'skip',
  )

  const money = (value: number) => formatPropertyMoney(value, currency)
  const rows = recipes?.data ?? []

  if (recipes === undefined && propertyId) {
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Menu item</th>
              <th className="p-2">Recipe</th>
              <th className="p-2">Servings</th>
              <th className="p-2">Cost</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={5}>
                  No recipes found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.menuItem?.name ?? '—'}</td>
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.servings}</td>
                <td className="p-2">{row.totalCost !== undefined ? money(row.totalCost) : '—'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <a href={`/admin/restaurant/recipes/view?recipe_id=${row._id}`} className="!no-underline">
                      <FcDocument />
                    </a>
                    {canUpdate && (
                      <a
                        href={`/admin/restaurant/recipes/edit?recipe_id=${row._id}`}
                        className="!no-underline !text-amber-400"
                      >
                        <MdEditDocument />
                      </a>
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
