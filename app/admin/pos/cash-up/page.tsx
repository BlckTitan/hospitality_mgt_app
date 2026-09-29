'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import CashUp from '../components/cashUp'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>POS cash-up</h3>
        <BackLink />
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Compare expected cash tenders from the server&apos;s POS checks to counted drawer cash. A
        shortage creates a pending staff liability for approval and payroll deduction (or cash
        collection).
      </p>
      <CashUp />
    </div>
  )
}
