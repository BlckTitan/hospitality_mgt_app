'use client'
import { SignedIn, UserButton } from '@clerk/nextjs'
import React from 'react'
import { Nav, Navbar, NavbarBrand, NavbarCollapse, NavbarToggle, NavLink } from 'react-bootstrap'
import { FaUsers, FaRegChartBar, FaCreditCard, FaCoins, FaDollyFlatbed, FaMailBulk } from "react-icons/fa";

export default function Navigation() {
    
  return (
    <nav className="w-full h-14 flex items-center fixed top-0 main_nav z-10 shadow-blue-100 shadow-sm">
      <Navbar expand="lg" className='w-full h-full flex items-center px-4 lg:px-16 bg-white rounded-none'>
        <div className='w-full h-full flex justify-between items-center'>
          
          <div className='w-full flex justify-between '>
            <NavbarBrand className='site_sub_title' href='/'>Hospitality Manager</NavbarBrand>
            <NavbarToggle aria-controls="basic-navbar-nav relative" />
          </div>
          
          <NavbarCollapse id="basic-navbar-nav" className='right-0 top-14 w-full lg:w-auto absolute lg:static border-b border-t lg:border-0 bg-white'>
            <Nav className="w-full lg:w-fit px-4 flex flex-col items-start lg:flex-row lg:items-center lg:justify-evenly me-auto">

              <NavLink href="/#">
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </NavLink>

              {/* sidebar links for dropdown navigationin smaller devices */}
              <NavLink href="/#" className='main_nav_link'>
                <span>Sales</span>
                <i className='icon'><FaCreditCard /></i>
              </NavLink> 

              <NavLink href="/#" className='main_nav_link'>
                <span>Expenditure</span>
                <i className='icon'><FaCoins /></i>
              </NavLink> 
              
              <NavLink href="/#" className='main_nav_link'>
                <span>Report and Analytics</span>
                <i className='icon'><FaRegChartBar /></i>
              </NavLink> 
              
              <NavLink href="/#" className='main_nav_link'>
                <span>Staff</span>
                <i className='icon'><FaUsers /></i>
              </NavLink> 
              
              <NavLink href="/#" className='main_nav_link'>
                <span>Inventory</span>
                <i className='icon'><FaDollyFlatbed /></i>
              </NavLink> 
              
              <NavLink href="/#" className='main_nav_link'>
                <span>Billing</span>
                <i className='icon'><FaMailBulk /></i>
              </NavLink> 

              {/* <NavDropdown title="Dropdown" id="basic-nav-dropdown">
                <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>

                <NavDropdown.Item href="#action/3.2">
                  Another action
                </NavDropdown.Item>

                <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                
                <NavDropdown.Divider />

                <NavDropdown.Item href="#action/3.4">
                  Separated link
                </NavDropdown.Item>

              </NavDropdown> */}
              
            </Nav>
          </NavbarCollapse>

        </div>
      </Navbar >
    </nav>
  )
}