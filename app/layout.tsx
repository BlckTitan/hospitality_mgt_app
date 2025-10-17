
import type { Metadata } from "next";
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ClerkProvider } from '@clerk/nextjs'
import DashboardLayout from "../shared/dashboard-layout";
import ConvexClientProvider from '../components/ConvexClientProvider'

export const metadata: Metadata = {
  title: "Hospitality Manager",
  description: "A Hospitality Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error('Missing CLERK_PUBLISHABLE_KEY');
  }
  
  return (
   <ClerkProvider publishableKey={publishableKey}> 
      <html lang="en">
        <body>
          <DashboardLayout>
            <ConvexClientProvider>
              {children}
            </ConvexClientProvider>
          </DashboardLayout>
        </body>
      </html>
  </ClerkProvider>
  );
}
