'use client'

import Link from 'next/link'
import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import Orders from './components/orders'
import { RestaurantPageGuide } from '../components/restaurantPageGuide'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant orders</h1>
          <RestaurantPageGuide page="orders" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/restaurant/pos" className="text-sm text-blue-600 hover:underline">
            Open POS
          </Link>
          <BackLink />
        </div>
      </header>

      <Orders />
    </div>
  )
}
