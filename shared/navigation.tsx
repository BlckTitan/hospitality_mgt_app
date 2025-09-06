'use client'
import { SignedIn, UserButton } from '@clerk/nextjs'
import React from 'react'
import { Container, Nav, Navbar, NavbarBrand, NavbarCollapse, NavbarToggle, NavDropdown, NavLink } from 'react-bootstrap'

export default function Navigation() {
    
  return (
    <nav className="w-full h-14 flex items-center fixed top-0 main_nav z-10">
        <Navbar expand="lg" className='w-full h-full flex items-center px-4 lg:px-16 bg-white rounded-none'>
          <Container className='w-full h-full flex justify-between items-center'>
            
            <div className='w-full flex justify-between '>
              <NavbarBrand className='site_sub_title'>Hospitality Manager</NavbarBrand>
              <NavbarToggle aria-controls="basic-navbar-nav" />
            </div>

            <NavbarCollapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <NavLink href="/#">
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </NavLink>
                <NavLink href="/#" className='hidden lg:inline-block'>link</NavLink>  

                <NavDropdown title="Dropdown" id="basic-nav-dropdown">
                  <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                  <NavDropdown.Item href="#action/3.2">
                    Another action
                  </NavDropdown.Item>
                  <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item href="#action/3.4">
                    Separated link
                  </NavDropdown.Item>
                </NavDropdown>
                
              </Nav>
            </NavbarCollapse>

          </Container>
        </Navbar >
      </nav>
  )
}
{/* <SignedIn>
  <UserButton />
</SignedIn>
<NavigationMenuLink className='border rounded-sm inline-block lg:hidden'>
  <i><RxTextAlignJustify className='w-24 h-24'/></i>
</NavigationMenuLink> */}