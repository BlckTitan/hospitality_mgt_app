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
            <section className="w-full min-h-dvh pt-14 relative flex">
                <Sidebar />
                <main className="w-full min-h-[calc(100dvh-3.5rem)] xl:w-[calc(100%-300px)] xl:ml-auto p-3 lg:p-6">{children}</main>
            </section>
        </>
    );
}
// levi8ted