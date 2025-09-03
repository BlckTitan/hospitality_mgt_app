import type { Metadata } from "next";
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs'

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        {/* <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/> */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;,1,400;1,500;1,600;1,700;&family=Roboto:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet"/>
      </head>
      <body>
        {children}
      </body>
    </html>
  </ClerkProvider>
  );
}
