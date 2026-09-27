'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React from 'react'
import { BarManagementPageGuide } from '../components/barManagementPageGuide'
import MyStock from './components/myStock'

export default function Page() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>My stock today</h3>
        <BackLink />
      </header>

      <BarManagementPageGuide page="my-stock" />
      <MyStock />
    </div>
  )
}
