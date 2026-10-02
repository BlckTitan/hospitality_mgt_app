'use client'

import { UserProfile } from "@clerk/nextjs";
import ClerkUiMount from "../../../components/ClerkUiMount";
import Navigation from "../../../shared/navigation";
import Spinner from "../../../shared/spinner";

export default function AccountPage() {
  return (
    <div className="w-full h-screen flex justify-center items-center">
      <Navigation />
      <ClerkUiMount fallback={<Spinner size="md" />}>
        <UserProfile />
      </ClerkUiMount>
    </div>
  );
}