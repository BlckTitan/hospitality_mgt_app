'use client'

import { ReactNode } from 'react'
import { ClerkProvider as ClerkProviderWrapper } from '@clerk/nextjs'

interface ClerkProviderProps {
  children: ReactNode
  publishableKey: string
}

export default function ClerkProvider({ children, publishableKey }: ClerkProviderProps) {
  if (!publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }

  return (
    <ClerkProviderWrapper publishableKey={publishableKey}>
      {children}
    </ClerkProviderWrapper>
  )
}
