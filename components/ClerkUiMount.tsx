'use client'

import { useAuth, useClerk } from '@clerk/nextjs'
import { ReactNode, useEffect, useState } from 'react'

/**
 * Defers Clerk prebuilt UI (SignIn, UserButton, etc.) until Clerk is loaded
 * and the page has hydrated. Avoids:
 * "[Clerk UI] Component renderer did not mount within 10s"
 * which is common under Turbopack when UI mounts during hydration / chunk load.
 *
 * Prefer `pnpm dev` (webpack) over `pnpm dev:turbo` if this still appears.
 */
export default function ClerkUiMount({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const { isLoaded } = useAuth()
  const clerk = useClerk()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoaded || !clerk.loaded) {
      setReady(false)
      return
    }

    let cancelled = false
    let idleId: number | undefined
    let timeoutId: number | undefined

    const enable = () => {
      if (!cancelled) setReady(true)
    }

    // Double-rAF waits for paint after hydration; idleCallback yields to chunk work.
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (typeof window.requestIdleCallback === 'function') {
          idleId = window.requestIdleCallback(enable, { timeout: 1500 })
        } else {
          timeoutId = window.setTimeout(enable, 50)
        }
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isLoaded, clerk.loaded])

  if (!ready) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
