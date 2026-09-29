'use client'

import { BackLink } from '../../../shared/pageHeader'
import React from 'react'
import PosTerminal from './components/posTerminal'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>POS</h3>
        <BackLink />
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Bar and room-service checks from one terminal. Record cash, card, room charge, or open tab —
        no payment gateway. Guest F&amp;B revenue uses settled POS totals; My Stock Today stays stock
        control.
      </p>
      <PosTerminal />
    </div>
  )
}
