'use client'

import { useQuery, useConvexAuth } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../../../../../convex/_generated/api'
import { Id } from '../../../../../../convex/_generated/dataModel'
import Spinner from '../../../../../../shared/spinner'
import { formatPropertyMoney, usePropertyCurrency } from '../../../../inventory-management/components/money'

export default function RecipeViewComponent() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams()
  const id = searchParams.get('recipe_id') ?? null
  const response = useQuery(
    api.recipes.getRecipe,
    isAuthenticated && id ? { recipeId: id as Id<'recipes'> } : 'skip',
  )
  const currency = usePropertyCurrency(response?.success ? response.data?.propertyId : undefined)

  if (response === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner size="sm" />
      </div>
    )
  }
  if (!response?.success || !response.data) return <div>No data available!</div>

  const recipe = response.data
  const money = (value: number) => formatPropertyMoney(value, currency)

  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{recipe.menuItem?.name ?? recipe.name}</h2>
        <p className="text-sm text-gray-600">
          {recipe.name} · {recipe.servings} serving(s)
        </p>
        <p className="text-sm text-gray-800 mt-2">
          Total cost {recipe.totalCost !== undefined ? money(recipe.totalCost) : '—'}
        </p>
        {recipe.instructions ? (
          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{recipe.instructions}</p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Ingredient</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2">Waste %</th>
            </tr>
          </thead>
          <tbody>
            {recipe.lines.length === 0 && (
              <tr>
                <td className="p-3" colSpan={4}>
                  No ingredient lines yet.
                </td>
              </tr>
            )}
            {recipe.lines.map((line) => (
              <tr key={line._id} className="border-t">
                <td className="p-2">{line.inventoryItem?.name ?? '—'}</td>
                <td className="p-2">{line.quantity}</td>
                <td className="p-2">{line.unit}</td>
                <td className="p-2">{line.wastePercent ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
