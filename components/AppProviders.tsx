'use client'

import { ReactNode, Suspense } from 'react'
import { Toaster } from 'sonner'
import ClerkProvider from './ClerkProviderWrapper'
import ConvexClientProvider from './ConvexClientProvider'
import { PermissionsProvider } from '../hooks/usePermissions'
import Spinner from '../shared/spinner'

export default function AppProviders({
  children,
  publishableKey,
}: {
  children: ReactNode
  publishableKey: string
}) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <Suspense
        fallback={
          <div className="w-full h-screen flex justify-center items-center">
            <Spinner size="sm" />
          </div>
        }
      >
        <ConvexClientProvider>
          <PermissionsProvider>{children}</PermissionsProvider>
        </ConvexClientProvider>
        <Toaster position="bottom-right" />
      </Suspense>
    </ClerkProvider>
  )
}
