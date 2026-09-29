'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import PosTerminal from '../../pos/components/posTerminal'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Room service POS</h3>
        <BackLink />
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Select an in-house or confirmed reservation first, then add items. Room charge posts to the
        guest folio; cash/card remain available. Same order ledger as Bar POS.
      </p>
      <PosTerminal variant="room_service" />
    </div>
  )
}
