'use client'

import React from 'react'
import { FaUsers, FaRegChartBar, FaCreditCard, FaCoins, FaDollyFlatbed, FaMailBulk } from "react-icons/fa";

export default function Sidebar() {
  return (
    <aside className='w-[300px] max-w-[300px] h-full fixed left-0 hidden pt-14 xl:inline-block'>

      <ul className='w-full h-full pt-16 text-white !px-0 glass'>

        <li>
          <a href="/#">Sales</a>
          <i className='icon'><FaCreditCard /></i>
        </li>

        <li>
          <a href="/#">Expenditure</a>
          <i className='icon'><FaCoins /></i>
        </li>

        <li>
          <a href="/#">Report and Analytics</a>
          <i className='icon'><FaRegChartBar /></i>
        </li>

        <li>
          <a href="/admin/staff">Staff</a>
          <i className='icon'><FaUsers /></i>
        </li>

        <li>
          <a href="/#">Inventory</a>
          <i className='icon'><FaDollyFlatbed /></i>
        </li>

        <li>
          <a href="/#">Biling</a>
          <i className='icon'><FaMailBulk /></i>
        </li>
      </ul>

    </aside>
  )
}
