'use client'

import dynamic from 'next/dynamic'
import React from 'react'

function NavChromeSkeleton() {
  return (
    <div className="w-full h-14 flex items-center fixed top-0 z-30 bg-white shadow-sm px-4 lg:px-16" aria-hidden>
      <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="ml-auto h-8 w-8 animate-pulse rounded-full bg-neutral-200" />
    </div>
  )
}

function SidebarChromeSkeleton() {
  return (
    <aside className="w-[300px] max-w-[300px] h-dvh max-h-dvh fixed left-0 hidden pt-14 xl:flex xl:flex-col z-20" aria-hidden>
      <div className="w-full px-3 pt-4 space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-white/20" />
        <div className="flex items-center gap-3 py-2">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/20" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-28 animate-pulse rounded bg-white/20" />
            <div className="h-3 w-36 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded bg-white/10" />
        ))}
      </div>
    </aside>
  )
}

// Separate chunks so auth routes never download nav/sidebar icon packs
const Navigation = dynamic(() => import('../shared/navigation'), {
  ssr: false,
  loading: () => <NavChromeSkeleton />,
})

const Sidebar = dynamic(() => import('../shared/sidebar'), {
  ssr: false,
  loading: () => <SidebarChromeSkeleton />,
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <section className="w-full min-w-0 min-h-dvh pt-14 relative">
        <Sidebar />
        {/* Fixed sidebar is out of flow; ml offsets main and width:auto fills the rest */}
        <main className="min-w-0 min-h-[calc(100dvh-3.5rem)] p-3 lg:p-6 xl:ml-[300px] ">
          {children}
        </main>
      </section>
    </>
  )
}
