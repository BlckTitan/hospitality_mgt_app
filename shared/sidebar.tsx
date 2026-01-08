'use client'

import { usePathname } from 'next/navigation';
import React from 'react'
import { Dropdown } from 'react-bootstrap';
import { FcConferenceCall, FcCurrencyExchange, FcDepartment, FcList, FcManager, FcMoneyTransfer, FcPhone, FcSalesPerformance } from "react-icons/fc";
import { MdOutlineBedroomChild } from 'react-icons/md';
import { RxDashboard } from "react-icons/rx";

const navLinks = [
  {id: 1, href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  {id: 2, href: "/admin/property", label: "Properties", icon: <FcDepartment /> },
  {id: 3, href: "/admin/user", label: "Users", icon: <FcManager />, subLink: [{id: 21, href: '/admin/role', label: 'Role'}, {id: 22, href: '/admin/userRole', label: 'User role'}]},
  {id: 4, href: "/#", label: "Sales", icon: <FcCurrencyExchange /> },
  {id: 5, href: "/#", label: "Expense Tracker", icon: <FcMoneyTransfer /> },
  {id: 6, href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
  {id: 7, href: "/admin/staff", label: "Staff", icon: <FcConferenceCall /> },
  {id: 8, href: "/#", label: "Inventory", icon: <FcList /> },
  {id: 10, href: "/room-management", label: "Room Management", icon: <MdOutlineBedroomChild />,  subLink: [
    {id: 101, href: '/admin/room-management/room-types', label: 'Room Types'}, 
    {id: 102, href: '/admin/room-management/room', label: 'Room'},
    {id: 103, href: '/admin/room-management/reservation', label: 'Reservation'}, 
    {id: 104, href: '/admin/room-management/guest', label: 'Guest'}
  ]},
];
export default function Sidebar() {
  
  const path = usePathname()

  return (
    <aside className='w-[300px] max-w-[300px] h-full fixed left-0 hidden pt-14 xl:inline-block z-10'>

      <div className='w-full h-full pt-16 text-white !px-0 glass'>

      {navLinks.map(({ id, href, label, icon, subLink }, index) => (
        <div             
          className={`w-full h-12 flex items-center justify-center my-2 hover:!bg-white/10 ${(href === path) ? "!bg-[#333] text-white " : "bg-transparent"}`}
          key={id}
        >
          {/* main link */}
          <a 
            key={id} 
            href={href} 
          >
            <span>{label}</span>
            <i className="icon">{icon}</i>
          </a>

          {/* dropdown if sublink exists */}
          {
            (
              <Dropdown drop='end'>
                <Dropdown.Toggle 
                  key={id}
                  variant="" 
                  id="dropdown-basic"
                  className={`!border-0 !bg-transparent !shadow-none 
                    focus:!shadow-none focus:!outline-none text-white
                    ${!subLink ? "invisible" : ""}`}
                >
                  {/* <FaCaretRight className="text-white text-lg" /> */}
                </Dropdown.Toggle>

                <Dropdown.Menu 
                  className='dropdown-menu !bg-[#000] !rounded-none'
                  key={label}
                >
                  {
                    subLink && subLink.map((link, subIndex) => (
                      <Dropdown.Item 
                        href={link.href} 
                        key={link.id}
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
