'use client'
import { SignedIn, UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation';
import React from 'react'
import { Accordion, Card, Nav, Navbar, NavbarBrand, NavbarCollapse, NavbarToggle, NavLink, useAccordionButton } from 'react-bootstrap'
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcCurrencyExchange, FcDepartment, FcManager } from "react-icons/fc";
import { MdOutlineBedroomChild } from 'react-icons/md';
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
  { id: 4, href: "/#", label: "Sales", icon: <FcCurrencyExchange /> },
  { id: 5, href: "/#", label: "Expenditure", icon: <FcMoneyTransfer /> },
  { id: 6, href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
  {id: 8, href: "/admin/inventory-management", label: "Inventory Management", icon: <FcList /> ,  subLink: [
    {id: 801, href: '/admin/inventory-management/inventory-item', label: 'Inventory Item'}, 
    {id: 802, href: '/admin/inventory-management/inventory-transaction', label: 'Inventory Transaction'},
    {id: 803, href: '/admin/inventory-management/supplier', label: 'Supplier'}, 
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

              <NavLink href="/#" className='py-2 px-4'>
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
