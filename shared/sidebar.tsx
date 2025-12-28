'use client'

import { usePathname } from 'next/navigation';
import React from 'react'
import { DropdownButton, Dropdown } from 'react-bootstrap';
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcCurrencyExchange, FcDepartment, FcManager } from "react-icons/fc";
import { RxDashboard } from "react-icons/rx";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  { href: "/admin/property", label: "Properties", icon: <FcDepartment /> },
  { href: "/admin/user", label: "Users", icon: <FcManager />, subLink: [{href: '/admin/role', label: 'Role'}, {href: '/admin/userRole', label: 'User role'}]},
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

      {navLinks.map(({ href, label, icon, subLink }, index) => (
        <div             
          className={`w-full h-12 flex items-center justify-center my-2 hover:!bg-white/10 ${(href === path) ? "!bg-[#333] text-white " : "bg-transparent"}`}
        >
          <a 
            key={index} 
            href={href} 
          >
            <span>{label}</span>
            <i className="icon">{icon}</i>
          </a>
          
          <DropdownButton
            key={index+1}
            id='dropdown-button-drop-end'
            drop='end'
            variant=""
            title=""
            className={subLink ? `custom-dropdown` : `invisible`}
          >
            {
              subLink && subLink.map((link, subIndex) => (
                <Dropdown.Item eventKey={subIndex}>
                  <a href={link.href}>{link.label}</a>
                </Dropdown.Item>
              ))
            }

          </DropdownButton>

        </div>
      ))}
      </div>

    </aside>
  )
}
