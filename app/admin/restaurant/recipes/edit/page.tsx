'use client'

import { BackLink } from '../../../../../shared/pageHeader'
import React from 'react'
import Spinner from '../../../../../shared/spinner'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { useSearchParams } from 'next/navigation'
import { FormComponent } from '../components/editRecipeForm'

export default function Page() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams()
  const id = searchParams.get('recipe_id') ?? null
  const response = useQuery(
    api.recipes.getRecipe,
    isAuthenticated && id ? { recipeId: id as Id<'recipes'> } : 'skip',
  )

  if (response === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner size="sm" />
      </div>
    )
  }
  if (!response?.success || !response.data) return <div>No data available!</div>

  const recipe = response.data

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Update {recipe.menuItem?.name ?? recipe.name}</h1>
          <p className="text-gray-600">Update this recipe’s ingredients, quantities, and waste.</p>
        </div>
        <BackLink />
      </header>

      <FormComponent
        id={recipe._id}
        propertyId={recipe.propertyId}
        name={recipe.name}
        servings={recipe.servings}
        menuItemName={recipe.menuItem?.name}
        totalCost={recipe.totalCost}
        updatedAt={recipe.updatedAt}
        lines={recipe.lines.map((line) => ({
          _id: line._id,
          inventoryItemId: line.inventoryItemId,
          quantity: line.quantity,
          unit: line.unit,
          wastePercent: line.wastePercent,
        }))}
      />
    </div>
  )
}
