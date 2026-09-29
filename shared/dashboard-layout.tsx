'use client'

import Navigation from '../shared/navigation'
import Sidebar from '../shared/sidebar'
import { isNoDashboardLayoutPath } from '../lib/auth-routes'
import { usePathname } from 'next/navigation'
import React from 'react'

export default function DashboardLayout({children}: {children: React.ReactNode}) {
    const path = usePathname()

    if (isNoDashboardLayoutPath(path)) {
        return <>{children}</>;
    }

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
    );
}
// levi8ted