'use client'

import Link from 'next/link'
import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import RestaurantPos from './components/restaurantPos'
import { RestaurantPageGuide } from '../components/restaurantPageGuide'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant POS</h1>
          <RestaurantPageGuide page="pos" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/restaurant/orders" className="text-sm text-blue-600 hover:underline">
            Orders
          </Link>
          <BackLink />
        </div>
      </header>

      <RestaurantPos />
    </div>
  )
}
