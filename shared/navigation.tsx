'use client'
import { SignedIn, UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation';
import React from 'react'
import { Accordion, Card, Dropdown, Nav, Navbar, NavbarBrand, NavbarCollapse, NavbarToggle, NavLink, useAccordionButton } from 'react-bootstrap'
import { FcPhone, FcSalesPerformance , FcConferenceCall, FcMoneyTransfer , FcList, FcCurrencyExchange, FcDepartment, FcManager } from "react-icons/fc";
import { RxDashboard, RxCaretDown } from "react-icons/rx";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <RxDashboard className='text-blue-500'/> },
  { href: "/admin/property", label: "Properties", icon: <FcDepartment /> },
  { href: "/admin/user", label: "Users", icon: <FcManager />, subLink: [{href: '/admin/role', label: 'Role'}, {href: '/admin/userRole', label: 'User role'}] },
  { href: "/#", label: "Sales", icon: <FcCurrencyExchange /> },
  { href: "/#", label: "Expenditure", icon: <FcMoneyTransfer /> },
  { href: "/#", label: "Report and Analytics", icon: <FcSalesPerformance /> },
  { href: "/admin/staff", label: "Staff", icon: <FcConferenceCall /> },
  { href: "/#", label: "Inventory", icon: <FcList /> },
  { href: "/#", label: "Billing", icon: <FcPhone /> },
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
          
          <NavbarCollapse id="basic-navbar-nav" className='right-0 top-14 w-full lg:w-auto absolute lg:static border-b border-t lg:border-0 bg-white'>
            <Nav className="w-full lg:w-fit flex flex-col items-start lg:flex-row lg:items-center lg:justify-evenly me-auto">

              <NavLink href="/#" className='py-2 px-4'>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </NavLink>
              
              <Accordion 
                defaultActiveKey="0" 
                className='w-full h-12 inline-block lg:hidden'
              >
                {navItems.map(({ href, label, icon, subLink }, index) => (

                  <Card className='border-0' key={href+4}>
                    
                    <Card.Header 
                      className={`
                        flex justify-between items-center !p-0 !border-0
                        ${(href === path) ? "!bg-[#333] text-white" : "bg-transparent"}
                      `}
                    >
                      <NavLink
                        key={index}
                        href={href}
                        className={`main_nav_link ${(href === path) ? "!bg-[#333] text-white" : "bg-transparent"}`}
                      >
                        <span>{label}</span>
                        <i className="icon">{icon}</i>
                      </NavLink>
                      

                      {/* {
                        subLink && subLink.map((link, subIndex) => (
                          <CustomToggle 
                            eventKey={link.href} 
                            key={subIndex}
                            className={`!bg-transparent ${!subLink ? "invisible" : ""}`}
                          >
                            <i className='icon'><RxCaretDown /></i>
                          </CustomToggle>
                        ))
                      } */}

                      {
                        subLink && (
                          <CustomToggle 
                            key={href}
                            eventKey={
                              subLink && subLink.map((items, subIndex) => (
                                items.href
                              ))
                            }
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
                          eventKey={link.href} 
                          key={subIndex}
                          className={`!bg-transparent ${!subLink ? "invisible" : ""}`}
                        >
                          <Card.Body>
                            <NavLink
                              key={index}
                              href={link.href}
                              className='px-2 border-b'
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

function CustomToggle({ children, eventKey }) {
  const decoratedOnClick = useAccordionButton(eventKey, () =>
    console.log('custom toggle active'),
  );

  return (
    <button
      type="button"
      style={{ backgroundColor: 'transparent' }}
      onClick={decoratedOnClick}
    >
      {children}
    </button>
  );
}

{/* Sidebar links for dropdown navigation in smaller devices */}
// {navItems.map(({ href, label, icon, subLink }, index) => (
//   <div             
//     className={`w-full h-12 flex items-center justify-center my-2 hover:!bg-white/10 ${(href === path) ? "!bg-[#333] text-white " : "bg-transparent"}`}
//   >
//     <NavLink
//       key={index}
//       href={href}
//       className={`main_nav_link ${(href === path) ? "!bg-[#333] text-white" : "bg-transparent"}`}
//     >
//       <span>{label}</span>
//       <i className="icon">{icon}</i>
//     </NavLink>

//     {/* dropdown if sublink exists */}
//     {
//       (
//         <Dropdown drop='start' key={href}>
//           <Dropdown.Toggle 
//             key={index+1}
//             variant="" 
//             id="dropdown-basic"
//             className={`!border-0 !bg-transparent !shadow-none 
//               focus:!shadow-none focus:!outline-none text-black
//               ${!subLink ? "invisible" : ""}`}
//           >
//             {/* <FaCaretRight className="text-white text-lg" /> */}
//           </Dropdown.Toggle>

//           <Dropdown.Menu 
//             className='!bg-[#000] !rounded-none'
//             key={index+2}
//           >
//             {
//               subLink && subLink.map((link, subIndex) => (
//                 <Dropdown.Item 
//                   href={link.href} 
//                   key={subIndex}
//                   className='w-full h-10 !flex !items-center text-white my-2 hover:!bg-white/10'
//                 >
//                   <span>{link.label}</span>
//                 </Dropdown.Item>
//               ))
//             }
//           </Dropdown.Menu>

//         </Dropdown>
//       )
//   }
//   </div>
// ))}
