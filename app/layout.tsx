import type { Metadata } from "next";
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ClerkProvider } from '@clerk/nextjs'
import Navigation from "@/shared/navigation";

export const metadata: Metadata = {
  title: "Hospitality Manager",
  description: "A Hospitality Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  
  return (
   <ClerkProvider> 
    <html lang="en">
      <body>
        <Navigation/>
        {children}
      </body>
    </html>
  </ClerkProvider>
  );
}
