'use client'

import { BackLink } from '../../../../../shared/pageHeader'
import React, { Suspense } from 'react'
import RecipeViewComponent from './components/recipe-view'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Recipe</h1>
          <p className="text-gray-600">This recipe’s menu item, servings, and ingredient lines.</p>
        </div>
        <BackLink />
      </header>

      <Suspense fallback={<p>Please wait...</p>}>
        <RecipeViewComponent />
      </Suspense>
    </div>
  )
}
