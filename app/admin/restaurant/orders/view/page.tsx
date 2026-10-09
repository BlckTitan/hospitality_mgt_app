'use client'

import { BackLink } from '../../../../../shared/pageHeader'
import React, { Suspense } from 'react'
import OrderViewComponent from './components/order-view'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Order</h1>
          <p className="text-gray-600">This check’s lines, payments, and balance.</p>
        </div>
        <BackLink />
      </header>

      <Suspense fallback={<p>Please wait...</p>}>
        <OrderViewComponent />
      </Suspense>
    </div>
  )
}
