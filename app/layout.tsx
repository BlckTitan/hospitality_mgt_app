
import type { Metadata } from "next";
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { ClerkProvider } from '@clerk/nextjs'
import DashboardLayout from "../shared/dashboard-layout";
import ConvexClientProvider from '../components/ConvexClientProvider'
import { Suspense } from "react";
import { Spinner } from "react-bootstrap";
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "Hospitality Manager",
  description: "A Hospitality Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }
  
  return (
   <ClerkProvider publishableKey={publishableKey}> 
      <html lang="en">
        <body>
          <Suspense 
            fallback={
              <div className="w-full h-screen flex justify-center items-center">
                <Spinner variant="dark" size="sm"/>
              </div>
            }
          >
            <DashboardLayout>
              <ConvexClientProvider>
                {children}
              </ConvexClientProvider>
            </DashboardLayout>
            <Toaster position="bottom-right"/>
          </Suspense>
        </body>
      </html>
  </ClerkProvider>
  );
}
