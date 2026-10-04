'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import PosOrders from '../components/posOrders'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">POS orders</h1>
          <p className="text-gray-600">
            Open checks, open tabs, settled, and voided orders from the POS terminal. Find a check by
            its ID to review items, voids, and payments. Filter by type or status; pay down tabs from here.
          </p>
        </div>
        <BackLink />
      </header>
      <PosOrders />
    </div>
  )
}
