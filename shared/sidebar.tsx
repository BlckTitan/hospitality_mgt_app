'use client'

import { usePathname } from 'next/navigation';
import React from 'react'
import { DropdownButton, Dropdown } from 'react-bootstrap';
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcCurrencyExchange, FcDepartment, FcManager } from "react-icons/fc";
import { RxDashboard } from "react-icons/rx";
import { FaCaretRight } from "react-icons/fa";

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
          {/* main link */}
          <a 
            key={index} 
            href={href} 
          >
            <span>{label}</span>
            <i className="icon">{icon}</i>
          </a>

          {/* dropdown if sublink exists */}
          {
            (
              <Dropdown drop='end' key={href}>
                <Dropdown.Toggle 
                  key={index+1}
                  variant="" 
                  id="dropdown-basic"
                  className={`!border-0 !bg-transparent !shadow-none 
                    focus:!shadow-none focus:!outline-none text-white
                    ${!subLink ? "invisible" : ""}`}
                >
                  {/* <FaCaretRight className="text-white text-lg" /> */}
                </Dropdown.Toggle>

                <Dropdown.Menu 
                  className='!bg-[#000] !rounded-none'
                  key={index+2}
                >
                  {
                    subLink && subLink.map((link, subIndex) => (
                      <Dropdown.Item 
                        href={link.href} 
                        key={subIndex}
                        className='w-full h-10 !flex !items-center text-white my-2 hover:!bg-white/10'
                      >
                        <span>{link.label}</span>
                      </Dropdown.Item>
                    ))
                  }
                </Dropdown.Menu>

              </Dropdown>
            )
        }
        </div>
      ))}
      </div>

    </aside>
  )
}