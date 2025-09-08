'use client'

import Navigation from '@/shared/navigation'
import Sidebar from '@/shared/sidebar'
import { usePathname } from 'next/navigation'
import React from 'react'

export default function DashboardLayout({children}: {children: React.ReactNode}) {
    const path = usePathname()
    const noLayoutRoutes = ["/", "/admin-sign-in", "/admin-sign-up"];

    if (noLayoutRoutes.includes(path)) {
        return <>{children}</>;
    }

    return (
        <>
            <Navigation />
            <section className="w-full h-screen relative flex">
                <Sidebar />
                <main className="w-full xl:w-9/12 h-screen pb-4 pt-16">{children}</main>
            </section>
        </>
    );
}
