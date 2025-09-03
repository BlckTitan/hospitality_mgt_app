'use client'

import { SignedIn, SignedOut, SignInButton, SignUp, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'

export default function Page() {
  
  const { isSignedIn } = useUser()

  return (
    <div>
      <header>
        <SignedOut>
          <SignInButton />
          <SignUpButton>
            <button className="bg-[#6c47ff] text-ceramic-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>

        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
    </div>
  )
}
