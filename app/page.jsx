"use client"

import { SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs'
import React from 'react'

export default function Home() {

  return (
    <section className="w-full h-screen flex justify-center items-center">
          
      <div className='w-[400px] h-[500px] rounded-md flex flex-col items-center justify-center gap-4'>

        <header className='w-full h-fit flex flex-col items-center justify-center gap-2 mb-8'>

          <h1 className='text-4xl font-bold'>Welcome, Manager</h1>
          <p>Please, sign in to begin</p>

        </header>

        <div className='w-full h-fit flex items-center justify-center gap-4 mt-4'>
          <SignedOut className='w-full h-fit flex flex-col lg:flex-row items-center justify-center gap-4 mt-4'>
            <SignInButton>
              <button className="border bg-white hover:bg-blue-100 text-blue-500 rounded-sm font-medium text-sm sm:text-base w-full lg:w-1/2 h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                  Sign In
              </button>
            </SignInButton>

            <SignUpButton>
                <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-sm font-medium text-sm sm:text-base w-full lg:w-1/2 h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                    Sign Up
                </button>
            </SignUpButton>

        </SignedOut>
        </div>
          
      </div>
       
    </section>
  )
}
