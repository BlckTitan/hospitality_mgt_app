'use client'

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { FcConferenceCall, FcDepartment, FcList, FcManager, FcMoneyTransfer, FcPhone, FcSalesPerformance } from "react-icons/fc";
import { IoFastFoodOutline } from "react-icons/io5";
import { MdLogout, MdOutlineBedroomChild } from 'react-icons/md';
import { RxCaretDown, RxDashboard } from "react-icons/rx";
import Link from 'next/link';
import { Show, SignOutButton, useUser } from '@clerk/nextjs';
import { usePermissions } from '../hooks/usePermissions';
import { filterNavByAccess, isPathInSection } from '../lib/route-access';

const navLinks = [
  {id: 1, href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  {id: 2, href: "/admin/property", label: "Properties", icon: <FcDepartment /> },
  {id: 3, href: "/admin/user", label: "Users", icon: <FcManager />, subLink: [
    {id: 301, href: '/admin/user/role', label: 'Role'},
    {id: 303, href: '/admin/user', label: 'Users'},
  ]},
  {id: 4, href: "/admin/bar-management", label: "Bar Management", icon: <IoFastFoodOutline className='!text-green-600'/>,
    subLink: [
      {id: 401, href: '/admin/bar-management/bar', label: 'Bars'},
      { id: 402, href: '/admin/bar-management/beverages', label: 'Beverages'},
      { id: 403, href: '/admin/bar-management/user-stock-logs', label: 'User Stock Logs'},
      { id: 404, href: '/admin/bar-management/store-inventory', label: 'Store Inventory'},
      { id: 405, href: '/admin/bar-management/store-transactions', label: 'Store Transactions'},
    ]
  },
  {id: 5, href: "/#", label: "Expenditure", icon: <FcMoneyTransfer /> },
  {id: 6, href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
  {id: 7, href: "/admin/staff", label: "Staff", icon: <FcConferenceCall />, subLink: [
    {id: 701, href: '/admin/staff/myProfile', label: 'My profile'},
  ]},
  {id: 8, href: "/admin/inventory-management", label: "Inventory Management", icon: <FcList /> ,  subLink: [
    {id: 801, href: '/admin/inventory-management/inventory-item', label: 'Inventory Item'},
    {id: 802, href: '/admin/inventory-management/inventory-transaction', label: 'Inventory Transaction'},
    {id: 803, href: '/admin/inventory-management/supplier', label: 'Supplier'},
    {id: 804, href: '/admin/inventory-management/purchase-order', label: 'Purchase Order'},
    {id: 805, href: '/admin/inventory-management/purchase-order-line', label: 'Purchase Order Line'},
    {id: 806, href: '/admin/inventory-management/tasks', label: 'Inventory Tasks'},
  ]},
  {id: 9, href: "/admin/room-management", label: "Room Management", icon: <MdOutlineBedroomChild />,  subLink: [
    {id: 901, href: '/admin/room-management/room-type', label: 'Room Types'},
    {id: 902, href: '/admin/room-management/room', label: 'Room'},
    {id: 903, href: '/admin/room-management/reservation', label: 'Reservation'},
    {id: 904, href: '/admin/room-management/guest', label: 'Guest'},
      {id: 905, href: '/admin/room-management/housekeeping-task', label: 'Housekeeping Task'},
      {id: 906, href: '/admin/tasks/mine', label: 'My tasks'},
      {id: 907, href: '/admin/tasks/templates', label: 'Task templates'},
  ]},
  { id: 10, href: "/#", label: "Billing", icon: <FcPhone /> },
  {id: 11, href: "/admin/shift-management", label: "Shift Management", icon: <MdOutlineBedroomChild />,  subLink: [
    {id: 1101, href: '/admin/shift-management/templates', label: 'Department shifts'},
    {id: 1102, href: '/admin/shift-management/attendance', label: 'Attendance Tracker'},
    {id: 1103, href: '/admin/shift-management/cover', label: 'Cover'},
    {id: 1104, href: '/admin/shift-management/shift', label: 'Shift'},
    {id: 1105, href: '/admin/shift-management/hours', label: 'Hours'},
  ]},
  {id: 12, href: "/admin/payroll-management", label: "Payroll Management", icon: <FcMoneyTransfer />, subLink: [
    {id: 1201, href: '/admin/payroll-management/payroll', label: 'Payroll'},
    {id: 1203, href: '/admin/payroll-management/time-off', label: 'Time off'},
    {id: 1204, href: '/admin/payroll-management/settings', label: 'Payroll settings'},
  ]},
  {id: 13, href: "/admin/maintenance", label: "Maintenance", icon: <FcList />, subLink: [
    {id: 1301, href: '/admin/maintenance', label: 'Work orders'},
  ]},
];

export default function Sidebar() {
  const path = usePathname()
  const { user, isLoaded } = useUser();
  const { canAccessRoute, isLoading } = usePermissions();
  const [openHref, setOpenHref] = useState<string | null>(null);

  useEffect(() => {
    const active = navLinks.find((item) => item.subLink?.length && isPathInSection(path, item.href));
    if (active) {
      setOpenHref(active.href);
    }
  }, [path]);

  if (!isLoaded || isLoading) return null;

  const filteredNavLinks = filterNavByAccess(navLinks, canAccessRoute);

  return (
    <aside className='w-[300px] max-w-[300px] h-dvh max-h-dvh fixed left-0 hidden pt-14 xl:flex xl:flex-col z-10 overflow-hidden'>
      <div  className='w-full px-3 h-16 shrink-0 flex items-center gap-3'>
        <h3 className="hidden xl:inline-block text-lg font-bold text-white site_sub_title">Hospitality Manager</h3>
      </div>
      <header className='w-full px-3 h-16 shrink-0 flex items-center gap-3'>
        <Show when="signed-in">
          <div className='w-full h-fit flex items-start justify-between gap-3'>
            <img
              src={user?.imageUrl}
              alt="Profile Image"
              width={40}
              height={40}
              className='rounded-full object-cover'
            />

            <div className='w-full h-fit flex flex-col items-start gap-1'>
              <span className='text-black text-sm lg:!text-white'>{user?.fullName?.toLocaleUpperCase()}</span>
              <span className='text-black text-sm lg:!text-white'>{user?.primaryEmailAddress?.emailAddress}</span>
              <Link href="/account" className='hover:!text-blue-500 text-sm !text-gray-500 p-0'>Manage Account</Link>
            </div>
          </div>
        </Show>
      </header>
      <div className='w-full flex-1 min-h-0 overflow-y-auto overscroll-contain pt-4 text-white !px-0 glass sidebar-scroll'>

        {filteredNavLinks.map(({ id, href, label, icon, subLink }) => (
          <SidebarNavItem
            key={id}
            href={href}
            label={label}
            icon={icon}
            subLink={subLink}
            path={path}
            open={openHref === href}
            onToggle={() => setOpenHref((current) => (current === href ? null : href))}
          />
        ))}

        <div className='w-full h-fit py-2 px-3 mt-8 pb-6'>
          <SignOutButton redirectUrl="/">
            <button className='flex'>
              <i className='icon mr-2'><MdLogout /></i>
              Log Out
            </button>
          </SignOutButton>
        </div>

      </div>
    </aside>
  );
}

function SidebarNavItem({
  href,
  label,
  icon,
  subLink,
  path,
  open,
  onToggle,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  subLink?: { id: number; href: string; label: string }[];
  path: string;
  open: boolean;
  onToggle: () => void;
}) {
  const hasChildren = Boolean(subLink?.length);
  const sectionActive = isPathInSection(path, href);

  return (
    <div className="w-full my-2">
      <div className={`w-full h-12 flex items-center px-4 hover:!bg-black ${sectionActive ? '!bg-[#333] text-white' : 'bg-transparent'}`}>
        <Link href={href} className="!w-auto flex-1 !px-0 h-12 min-w-0">
          <span>{label}</span>
        </Link>
        <div className="flex items-center shrink-0 gap-1">
          {hasChildren && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
              onClick={onToggle}
              className="shrink-0 h-12 px-1"
            >
              <RxCaretDown className={`text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
          <i className="icon">{icon}</i>
        </div>
      </div>
      {hasChildren && (
        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className={`overflow-hidden origin-top transition-transform duration-200 ease-out ${open ? 'scale-y-100' : 'scale-y-0'}`}>
            <div className="w-full bg-white/10">
              {subLink!.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className={`h-10 pl-8 hover:!bg-black ${isPathInSection(path, link.href) ? '!bg-[#333] text-white' : 'bg-transparent'}`}
                >
                  <span className='ml-6'>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}