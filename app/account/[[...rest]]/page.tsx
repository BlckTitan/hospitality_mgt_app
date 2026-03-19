'use client'

import { UserProfile } from "@clerk/nextjs";
import Navigation from "../../../shared/navigation";

export default function AccountPage() {
  
  if(!UserProfile) return 'Loading user profile...';
  return (
    <div className="w-full h-screen flex justify-center items-center">
      <Navigation />
      <UserProfile />
    </div>
  );
}