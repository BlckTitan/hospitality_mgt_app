'use client'
import { SignedIn, SignOutButton, UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react'
import { Accordion, Card, Nav, Navbar, NavbarBrand, NavbarCollapse, NavbarToggle, NavLink, useAccordionButton } from 'react-bootstrap'
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcCurrencyExchange, FcDepartment, FcManager } from "react-icons/fc";
import { IoFastFoodOutline } from "react-icons/io5";
import { MdLogout, MdOutlineBedroomChild } from 'react-icons/md';
import { RxDashboard, RxCaretDown } from "react-icons/rx";

interface CustomToggleProps {
  eventKey: string
  children: React.ReactNode
  className?: string
}

const navItems = [
  { id: 1, href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  { id: 2, href: "/admin/property", label: "Properties", icon: <FcDepartment /> },
  { id: 3, href: "/admin/user", label: "Users", icon: <FcManager />, subLink: [{href: '/admin/role', label: 'Role'}, {href: '/admin/userRole', label: 'User role'}] },
  { id: 4, href: "/admin/food-n-beverage", label: "Food and Beverage", icon: <IoFastFoodOutline className='!text-brown-600'/>,  subLink: [
    { id: 401, href: '/admin/food-n-beverage/fnb-menu-item', label: 'Food and Beverage Menu Item'}, 
    { id: 402, href: '/admin/food-n-beverage/recipe', label: 'Recipe'}, 
    { id: 403, href: '/admin/food-n-beverage/recipe-line', label: 'Recipe Line'},
    { id: 404, href: '/admin/food-n-beverage/table', label: 'Table'},
  ]},
  { id: 5, href: "/#", label: "Expense Tracker", icon: <FcMoneyTransfer /> },
  { id: 6, href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
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

export default function Navigation() {

  const path = usePathname()
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;
  console.log(user);
  return (
    <nav className="w-full h-14 flex items-center fixed top-0 main_nav z-10 shadow-blue-100 shadow-sm">
      <Navbar expand="lg" className='w-full h-full flex items-center px-4 lg:px-16 bg-white rounded-none'>
        <div className='w-full h-full flex justify-between items-center'>
          
          <div className='w-full flex justify-between '>
            <NavbarBrand className='site_sub_title' href='/'>Hospitality Manager</NavbarBrand>
            <NavbarToggle aria-controls="basic-navbar-nav relative" />
          </div>
          
          <NavbarCollapse id="basic-navbar-nav" className='right-0 top-14 w-full lg:w-auto h-fit absolute lg:static border-b border-t lg:border-0 bg-white overflow-y-scroll lg:!overflow-hidden'>
            <Nav className="w-full lg:w-fit h-screen lg:h-fit flex flex-col items-start lg:flex-row lg:items-center lg:justify-evenly me-auto">

              <header className='w-full px-3  h-16 flex items-center gap-3 lg:hidden mt-8 pb-4'>
                <SignedIn>
                  <div className='w-full h-fit flex items-start gap-3'>
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
                </SignedIn>
              </header>

              <NavLink href="/#" className='py-2 px-4 !hidden lg:!inline-flex'>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </NavLink>
              
              <Accordion 
                defaultActiveKey="0" 
                className='w-full h-12 inline-block lg:hidden'
              >
                {navItems.map(({ id, href, label, icon, subLink }, index) => (

                  <Card className='border-0' key={id}>
                    
                    <Card.Header 
                      className={`
                        flex justify-between items-center !p-0 !border-0
                        ${(href === path) ? "!bg-[#333] text-white" : "bg-transparent"}
                      `}
                    >
                      <NavLink
                        key={id}
                        href={href}
                        className={`main_nav_link ${(href === path) ? "!bg-[#333] text-white" : "bg-transparent"}`}
                      >
                        <span>{label}</span>
                        <i className="icon">{icon}</i>
                      </NavLink>

                      {
                        (
                          <CustomToggle 
                            key={href}
                            eventKey={label}
                            className={`!bg-transparent ${!subLink ? "invisible" : ""}`}
                          >
                            <i className='icon'><RxCaretDown /></i>
                          </CustomToggle>
                        )
                      }

                    </Card.Header>

                    {
                      subLink && subLink.map((link, subIndex) => (
                        <Accordion.Collapse
                          eventKey={label} 
                          key={subIndex}
                          className={`!bg-transparent ${!subLink ? "invisible" : ""}`}
                        >
                          <Card.Body>

                            <NavLink
                              key={index}
                              href={link.href}
                              className='px-3 py-0 h-5 flex items-center'
                            >
                              <span>{link.label}</span>
                            </NavLink>

                          </Card.Body>
                        </Accordion.Collapse>
                      ))
                    }

                  </Card>
                ))}
                
                <div className='w-full h-fit py-2 px-3 mt-12 lg:hidden'>
                  <SignOutButton redirectUrl="/">
                    <button className='w-full flex !text-[#333]'>
                      <i className='icon mr-2'><MdLogout /></i>
                      <span>Log Out</span>
                    </button>
                  </SignOutButton>
                </div>

              </Accordion>

            </Nav>
          </NavbarCollapse>
                  
        </div>
        
      </Navbar >
    </nav>
  )
}

const CustomToggle: React.FC<CustomToggleProps> = ({ children, eventKey, className }: CustomToggleProps) => {
  const decoratedOnClick = useAccordionButton(eventKey, () =>
    console.log('custom toggle active'),
  );

  return (
    <button
      type="button"
      style={{ backgroundColor: 'transparent' }}
      onClick={decoratedOnClick}
      className={className || ''}
    >
      {children}
    </button>
  );
}
