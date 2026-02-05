'use client'

import { usePathname } from 'next/navigation';
import { Dropdown } from 'react-bootstrap';
import { FcConferenceCall, FcDepartment, FcList, FcManager, FcMoneyTransfer, FcPhone, FcSalesPerformance } from "react-icons/fc";
import { IoFastFoodOutline } from "react-icons/io5";
import { MdOutlineBedroomChild } from 'react-icons/md';
import { RxDashboard } from "react-icons/rx";

const navLinks = [
  {id: 1, href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  {id: 2, href: "/admin/property", label: "Properties", icon: <FcDepartment /> },
  {id: 3, href: "/admin/user", label: "Users", icon: <FcManager />, subLink: [{id: 21, href: '/admin/role', label: 'Role'}, {id: 22, href: '/admin/userRole', label: 'User role'}]},
  {id: 4, href: "/admin/food-n-beverage", label: "Food and Beverage", icon: <IoFastFoodOutline className='!text-green-600'/>,  subLink: [
  {id: 401, href: '/admin/food-n-beverage/fnb-menu-item', label: 'Food and Beverage Menu Item'}, 
  ]},
  {id: 5, href: "/#", label: "Expenditure", icon: <FcMoneyTransfer /> },
  {id: 6, href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
  {id: 7, href: "/admin/staff", label: "Staff", icon: <FcConferenceCall /> },
  {id: 8, href: "/admin/inventory-management", label: "Inventory Management", icon: <FcList /> ,  subLink: [
    {id: 801, href: '/admin/inventory-management/inventory-item', label: 'Inventory Item'}, 
    {id: 802, href: '/admin/inventory-management/inventory-transaction', label: 'Inventory Transaction'},
    {id: 803, href: '/admin/inventory-management/supplier', label: 'Supplier'}, 
    {id: 804, href: '/admin/inventory-management/purchase-order', label: 'Purchase Order'}, 
    {id: 805, href: '/admin/inventory-management/purchase-order-line', label: 'Purchase Order Line'}, 
  ]},
  {id: 9, href: "/admin/room-management", label: "Room Management", icon: <MdOutlineBedroomChild />,  subLink: [
    {id: 901, href: '/admin/room-management/room-type', label: 'Room Types'}, 
    {id: 902, href: '/admin/room-management/room', label: 'Room'},
    {id: 903, href: '/admin/room-management/reservation', label: 'Reservation'}, 
    {id: 904, href: '/admin/room-management/guest', label: 'Guest'},
    {id: 905, href: '/admin/room-management/housekeeping-task', label: 'Housekeeping Task'}
  ]},
  { id: 10, href: "/#", label: "Billing", icon: <FcPhone /> },
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
