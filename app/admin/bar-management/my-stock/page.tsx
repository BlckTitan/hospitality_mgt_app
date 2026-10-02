'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import { BarManagementPageGuide } from '../components/barManagementPageGuide'
import MyStock from './components/myStock'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">My stock today</h1>
        <BarManagementPageGuide page="my-stock" />
      </div>
        <BackLink />
      </header>
      <MyStock />
    </div>
  )
}
