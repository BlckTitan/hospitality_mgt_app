'use client'

import { BackLink } from '../../../../../shared/pageHeader'
import React from 'react'
import CashUp from '../components/cashUp'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">POS cash-up</h1>
          <p className="text-gray-600">
            Compare expected cash with the counted drawer, and expected card with the card terminal
            batch. A cash shortage creates a pending staff liability. A card difference is saved on
            the cash-up and does not create that liability.
          </p>
        </div>
        <BackLink />
      </header>
      <CashUp />
    </div>
  )
}
