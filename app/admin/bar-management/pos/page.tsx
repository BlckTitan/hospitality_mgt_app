'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import PosTerminal from './components/posTerminal'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">POS</h1>
          <p className="text-gray-600">
            Bar and room-service checks from one terminal. Record cash, card, room charge, or open tab —
            no payment gateway. A drink can be sold only while it is still in your stock for this property
            and bar.
          </p>
        </div>
        <BackLink />
      </header>
      <PosTerminal />
    </div>
  )
}
