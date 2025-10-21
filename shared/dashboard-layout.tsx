'use client'

import Navigation from '../shared/navigation'
import Sidebar from '../shared/sidebar'
import { usePathname } from 'next/navigation'
import React from 'react'

export default function DashboardLayout({children}: {children: React.ReactNode}) {
    const path = usePathname()
    const noLayoutRoutes = ["/", "/sign-in", "/sign-up"];

    if (noLayoutRoutes.includes(path)) {
        return <>{children}</>;
    }

    return (
        <>
            <Navigation />
            <section className="w-full h-[calc(100vh-56px)] relative flex">
                <Sidebar />
                <main className="w-full h-full xl:w-[calc(100%-300px)] absolute right-0 top-14 p-2 lg:p-4">{children}</main>
            </section>
        </>
    );
}
// levi8ted
// pk_test_YnJpZWYtY3ViLTkxLmNsZXJrLmFjY291bnRzLmRldiQ