'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import PosOrders from '../components/posOrders'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>POS orders</h3>
        <BackLink />
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Open checks, open tabs, settled, and voided orders for Bar POS and Room service POS. Filter
        by type or status; pay down tabs from here.
      </p>
      <PosOrders />
    </div>
  )
}
