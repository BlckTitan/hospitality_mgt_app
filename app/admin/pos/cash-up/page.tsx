'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import CashUp from '../components/cashUp'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">POS cash-up</h1>
          <p className="text-gray-600">
            Compare expected cash tenders from the server&apos;s POS checks to counted drawer cash. A
            shortage creates a pending staff liability for approval and payroll deduction (or cash
            collection).
          </p>
        </div>
        <BackLink />
      </header>
      <CashUp />
    </div>
  )
}
