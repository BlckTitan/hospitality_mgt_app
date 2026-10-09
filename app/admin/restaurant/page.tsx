'use client'

import { BackLink } from '../../../shared/pageHeader'
import React from 'react'
import Restaurant from './components/restaurant'
import { RestaurantPageGuide } from './components/restaurantPageGuide'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant</h1>
          <RestaurantPageGuide page="hub" />
        </div>
        <BackLink />
      </header>

      <Restaurant />
    </div>
  )
}
