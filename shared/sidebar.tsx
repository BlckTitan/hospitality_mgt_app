'use client'

import React from 'react'
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcCurrencyExchange } from "react-icons/fc";

export default function Sidebar() {
  return (
    <aside className='w-[300px] max-w-[300px] h-full fixed left-0 hidden pt-14 xl:inline-block'>

      <ul className='w-full h-full pt-16 text-white !px-0 glass'>

        <li>
          <a href="/#">Sales</a>
          <i className='icon'><FcCurrencyExchange  /></i>
        </li>

        <li>
          <a href="/#">Expense Tracker</a>
          <i className='ico'><FcMoneyTransfer  /></i>
        </li>

        <li>
          <a href="/#">Report and Analytics</a>
          <i className='icon'><FcSalesPerformance  /></i>
        </li>

        <li>
          <a href="/admin/staff">Staff</a>
          <i className='icon'><FcConferenceCall /></i>
        </li>

        <li>
          <a href="/#">Inventory</a>
          <i className='icon'><FcList  /></i>
        </li>

        <li>
          <a href="/#">Biling</a>
          <i className='icon'><FcPhone  /></i>
        </li>
      </ul>

    </aside>
  )
}
