'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { ConvexReactClient, useAction, useConvexAuth, useMutation } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'
import { api } from '../convex/_generated/api'

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error('Missing NEXT_PUBLIC_CONVEX_URL in your .env file')
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)

function EnsureCurrentUser() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const syncFromClerk = useAction(api.users.syncCurrentUserFromClerk)
  const started = useRef(false)

  useEffect(() => {
    if (isLoading || !isAuthenticated || started.current) {
      return
    }
    started.current = true
    void ensureCurrentUser()
      .then(() => syncFromClerk())
      .catch((error) => {
        started.current = false
        console.error('Failed to store signed-in user', error)
      })
  }, [isAuthenticated, isLoading, ensureCurrentUser, syncFromClerk])

  return null
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <EnsureCurrentUser />
      {children}
    </ConvexProviderWithClerk>
  )
}