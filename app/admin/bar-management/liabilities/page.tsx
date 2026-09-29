'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import StaffLiabilities from './components/staffLiabilities'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Staff liabilities</h3>
        <BackLink />
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Shortages attributed to staff. Approve for payroll deduction on the next Prepare pay, collect
        cash, or waive. Deducted after payroll approval.
      </p>
      <StaffLiabilities />
    </div>
  )
}
