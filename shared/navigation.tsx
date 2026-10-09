'use client'
import { Show, SignOutButton, useUser } from '@clerk/nextjs'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcDepartment, FcManager } from "react-icons/fc";
import { IoFastFoodOutline, IoRestaurantOutline } from "react-icons/io5";
import { MdLogout, MdOutlineBedroomChild, MdMenu, MdClose } from 'react-icons/md';
import { RxDashboard, RxCaretDown } from "react-icons/rx";
import { usePermissions } from '../hooks/usePermissions';
import { filterNavByAccess, isPathInSection } from '../lib/route-access';

const navItems = [
  { id: 1, href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  { id: 2, href: "/admin/property", label: "Properties", icon: <FcDepartment /> },
  { id: 3, href: "/admin/user", label: "Users", icon: <FcManager />, subLink: [
    {id: 301, href: '/admin/user/role', label: 'Role'}, 
    {id: 303, href: '/admin/user', label: 'Users'}, 
  ]},
  { id: 4, href: "/admin/bar-management", label: "Bar Management", icon: <IoFastFoodOutline className='!text-brown-600'/>,  
    subLink: [
      { id: 401, href: '/admin/bar-management/bar', label: 'Bars'}, 
      { id: 402, href: '/admin/bar-management/beverages', label: 'Beverages'}, 
      { id: 406, href: '/admin/bar-management/my-stock', label: 'My Stock Today'}, 
      { id: 407, href: '/admin/bar-management/stock-requests', label: 'Stock Requests'},
      { id: 403, href: '/admin/bar-management/user-stock-logs', label: 'User Stock Logs'}, 
      { id: 404, href: '/admin/bar-management/store-inventory', label: 'Store Inventory'}, 
      { id: 405, href: '/admin/bar-management/store-transactions', label: 'Store Transactions'},
      { id: 408, href: '/admin/bar-management/store-count', label: 'Store Count'},
    ]
  },
  { id: 14, href: "/admin/restaurant", label: "Restaurant", icon: <IoRestaurantOutline className="!text-orange-700"/>,
    subLink: [
      { id: 1401, href: '/admin/restaurant/menu-items', label: 'Menu items' },
      { id: 1402, href: '/admin/restaurant/recipes', label: 'Recipes' },
      { id: 1403, href: '/admin/restaurant/tables', label: 'Tables' },
      { id: 1404, href: '/admin/restaurant/pos', label: 'Restaurant POS' },
      { id: 1405, href: '/admin/restaurant/orders', label: 'Orders' },
      { id: 1406, href: '/admin/restaurant/kitchen', label: 'Kitchen board' },
    ]
  },
  { id: 5, href: "/#", label: "Expense Tracker", icon: <FcMoneyTransfer /> },
  { id: 6, href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
  {id: 7, href: "/admin/staff", label: "Staff", icon: <FcConferenceCall />, subLink: [
    {id: 701, href: '/admin/staff/myProfile', label: 'My profile'},
  ]},
  {id: 8, href: "/admin/inventory-management", label: "Inventory Management", icon: <FcList /> ,  subLink: [
    {id: 801, href: '/admin/inventory-management/inventory-item', label: 'Inventory Items'},
    {id: 802, href: '/admin/inventory-management/inventory-transaction', label: 'Stock Movements'},
    {id: 803, href: '/admin/inventory-management/supplier', label: 'Suppliers'},
    {id: 804, href: '/admin/inventory-management/purchase-order', label: 'Purchase Orders'},
    {id: 805, href: '/admin/inventory-management/tasks', label: 'Inventory Tasks'},
  ]},
  {id: 9, href: "/admin/room-management", label: "Room Management", icon: <MdOutlineBedroomChild />,  subLink: [
    {id: 900, href: '/admin/room-management/occupancy', label: 'Occupancy'},
    {id: 901, href: '/admin/room-management/room-type', label: 'Room Types'}, 
    {id: 902, href: '/admin/room-management/room', label: 'Room'},
    {id: 903, href: '/admin/room-management/reservation', label: 'Reservation'}, 
    {id: 904, href: '/admin/room-management/guest', label: 'Guest'},
    {id: 905, href: '/admin/room-management/housekeeping-task', label: 'Housekeeping Task'}
  ]},
  { id: 10, href: "/#", label: "Billing", icon: <FcPhone /> },
  {id: 11, href: "/admin/shift-management", label: "Shift Management", icon: <MdOutlineBedroomChild />,  subLink: [
    {id: 1101, href: '/admin/shift-management/templates', label: 'Department shifts'},
    {id: 1102, href: '/admin/shift-management/attendance', label: 'Attendance Tracker'},
    {id: 1103, href: '/admin/shift-management/cover', label: 'Cover'},
    {id: 1104, href: '/admin/shift-management/shift', label: 'Shift'},
    {id: 1105, href: '/admin/shift-management/hours', label: 'Hours'},
    {id: 1106, href: '/admin/shift-management/punctuality', label: 'Punctuality'},
  ]},
  {id: 12, href: "/admin/payroll-management", label: "Payroll Management", icon: <FcMoneyTransfer />, subLink: [
    {id: 1201, href: '/admin/payroll-management/payroll', label: 'Payroll'},
    {id: 1203, href: '/admin/payroll-management/time-off', label: 'Time off'},
    {id: 1204, href: '/admin/payroll-management/settings', label: 'Payroll settings'},
  ]},
];

function NavSkeleton() {
  return (
    <nav className="w-full h-14 flex items-center fixed top-0 main_nav z-30 bg-white shadow-blue-100 shadow-sm">
      <div className="w-full h-full flex items-center justify-between px-4 lg:px-16">
        <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200 lg:hidden" />
        <div className="hidden lg:flex items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-200" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function Navigation() {
  const path = usePathname()
  const { user, isLoaded } = useUser();
  const { canAccessRoute, isLoading } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  if (!isLoaded || isLoading) return <NavSkeleton />;

  const filteredNavItems = filterNavByAccess(navItems, canAccessRoute);
  const activeSection = filteredNavItems.find((item) => isPathInSection(path, item.href))?.label ?? null;
  const expanded = openSection ?? activeSection;

  return (
    <nav className="w-full h-14 flex items-center fixed top-0 main_nav z-30 bg-white shadow-blue-100 shadow-sm overflow-visible">
      <div className="w-full h-full flex items-center px-4 lg:px-16 bg-white overflow-visible">
        <div className="w-full h-full flex justify-between items-center gap-4 overflow-visible">
          <div className="w-full lg:w-auto shrink-0 flex items-center justify-between gap-2">
            <Link href="/" className="site_sub_title !text-lg lg:!text-xl font-semibold text-neutral-900 no-underline text-left">
              Hospitality Manager
            </Link>
            <button
              type="button"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-800"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <MdClose className="text-2xl" /> : <MdMenu className="text-2xl" />}
            </button>
          </div>

          <div
            id="basic-navbar-nav"
            className={`left-0 right-0 top-14 w-full lg:w-auto max-h-[calc(100dvh-3.5rem)] h-auto absolute lg:static lg:max-h-none border-b border-t lg:border-0 bg-white overflow-y-auto overscroll-contain lg:!overflow-visible ${
              menuOpen ? 'flex' : 'hidden'
            } lg:flex flex-col lg:flex-row`}
          >
            <div className="w-full lg:w-fit h-auto flex flex-col items-start lg:flex-row lg:items-center lg:justify-evenly me-auto">
              <header className="w-full px-3 h-16 flex items-center gap-3 lg:hidden mt-8 pb-4">
                <Show when="signed-in">
                  <div className="w-full h-fit flex items-start gap-3">
                    <img
                      src={user?.imageUrl}
                      alt="Profile Image"
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                    <div className="w-full h-fit flex flex-col items-start gap-1">
                      <span className="text-black text-sm lg:!text-white">{user?.fullName?.toLocaleUpperCase()}</span>
                      <span className="text-black text-sm lg:!text-white">{user?.primaryEmailAddress?.emailAddress}</span>
                    </div>
                  </div>
                </Show>
              </header>

              <div className="hidden lg:flex items-center gap-3 py-1 px-4 shrink-0">
                <Show when="signed-in">
                  <div className="flex flex-col items-start leading-tight min-w-0">
                    <span className="text-neutral-900 text-sm truncate max-w-[220px]">{user?.fullName?.toLocaleUpperCase()}</span>
                    <span className="text-neutral-600 text-xs truncate max-w-[220px]">{user?.primaryEmailAddress?.emailAddress}</span>
                  </div>
                  
                  <img
                    src={user?.imageUrl}
                    alt="Profile Image"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                </Show>
              </div>

              <div className="w-full h-auto block lg:hidden">
                {filteredNavItems.map(({ id, href, label, icon, subLink }) => {
                  const sectionActive = isPathInSection(path, href);
                  const isOpen = expanded === label;
                  return (
                    <div key={id} className="border-0">
                      <div
                        className={`flex items-center py-0 px-4 border-0 ${
                          sectionActive ? 'bg-[#333] text-white' : 'bg-transparent'
                        }`}
                      >
                        <Link
                          href={href}
                          className={`main_nav_link !w-auto flex-1 !px-0 min-w-0 ${
                            sectionActive ? '!bg-[#333] text-white' : 'bg-transparent'
                          }`}
                        >
                          <span>{label}</span>
                        </Link>
                        <div className="flex items-center shrink-0 gap-1">
                          {subLink?.length ? (
                            <button
                              type="button"
                              className="!bg-transparent shrink-0 h-12 px-1"
                              aria-expanded={isOpen}
                              onClick={() => setOpenSection((cur) => (cur === label ? null : label))}
                            >
                              <RxCaretDown className={`text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                          ) : null}
                          <i className="icon">{icon}</i>
                        </div>
                      </div>
                      {subLink?.length ? (
                        <div className={`overflow-hidden ${isOpen ? 'block' : 'hidden'}`}>
                          {subLink.map((link) => (
                            <Link
                              key={link.id}
                              href={link.href}
                              className={`px-3 py-2 ml-4 h-auto flex items-center ${
                                isPathInSection(path, link.href) ? '!bg-[#333] text-white' : ''
                              }`}
                            >
                              <span>{link.label}</span>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <div className="w-full h-fit py-2 px-3 mt-8 mb-6 lg:hidden">
                  <SignOutButton redirectUrl="/">
                    <button className="w-full flex !text-[#333]">
                      <i className="icon mr-2"><MdLogout /></i>
                      <span>Log Out</span>
                    </button>
                  </SignOutButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
