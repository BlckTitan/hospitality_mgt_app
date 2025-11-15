// Import global styles and fonts
import './globals.css'
import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}
 
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className='w-full h-screen flex flex-col items-center justify-center'>
        <h1 className='text-xl font-bold flex-wrap'>404 - Page Not Found</h1>
        <p>This page does not exist</p>
      </body>
    </html>
  )
}