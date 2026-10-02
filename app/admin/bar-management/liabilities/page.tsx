'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import StaffLiabilities from './components/staffLiabilities'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Staff liabilities</h1>
          <p className="text-gray-600">
            Shortages attributed to staff. Approve for payroll deduction on the next Prepare pay, collect
            cash, or waive. Deducted after payroll approval.
          </p>
        </div>
        <BackLink />
      </header>
      <StaffLiabilities />
    </div>
  )
}
