import type { Metadata } from 'next'
import { Open_Sans, Orbitron } from 'next/font/google'
import './globals.css'
import AppProviders from '../components/AppProviders'

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hospitality Manager',
  description: 'A Hospitality Management App',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <html lang="en" className={`${openSans.variable} ${orbitron.variable}`}>
      <body className={openSans.className}>
        <AppProviders publishableKey={publishableKey ?? ''}>{children}</AppProviders>
      </body>
    </html>
  )
}
