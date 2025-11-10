'use client'

import { usePathname } from 'next/navigation';
import React from 'react'
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcCurrencyExchange } from "react-icons/fc";
import { RxDashboard } from "react-icons/rx";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  { href: "/#", label: "Sales", icon: <FcCurrencyExchange /> },
  { href: "/#", label: "Expense Tracker", icon: <FcMoneyTransfer /> },
  { href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
  { href: "/admin/staff", label: "Staff", icon: <FcConferenceCall /> },
  { href: "/#", label: "Inventory", icon: <FcList /> },
  { href: "/#", label: "Billing", icon: <FcPhone /> },
];

export default function Sidebar() {
  
  const path = usePathname()

  return (
    <aside className='w-[300px] max-w-[300px] h-full fixed left-0 hidden pt-14 xl:inline-block'>

      <div className='w-full h-full pt-16 text-white !px-0 glass'>

      {navLinks.map(({ href, label, icon }, index) => (
        <a 
          key={index} 
          href={href} 
          className={`flex items-center justify-between p-2 hover:!bg-white/10 ${(href === path) ? "!bg-[#333] text-white " : "bg-transparent"}`}
        >
          <span>{label}</span>
          <i className="icon">{icon}</i>
        </a>
      ))}
      </div>

    </aside>
  )
}
