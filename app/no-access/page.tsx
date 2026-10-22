'use client';

import Link from 'next/link';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { ShieldX } from 'lucide-react';
import { Button } from '../../shared/button';
import { PROPERTY_SETUP_PATH } from '../../lib/route-access';

export default function NoAccessPage() {
  const { user } = useUser();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <ShieldX className="h-8 w-8 text-amber-700" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            No access yet
          </h1>

          {name ? (
            <p className="text-gray-800 mb-2">Signed in as {name}</p>
          ) : null}

          <p className="text-gray-600 mb-8">
            You don&apos;t have a role on a property yet. If you work at a property that already uses Hospitality Manager, ask its administrator to invite you. If you run a property, set it up to get started.
          </p>

          <div className="space-y-4">
            <Link href={PROPERTY_SETUP_PATH}>
              <Button className="w-full">Set up a new property</Button>
            </Link>

            <SignOutButton redirectUrl="/">
              <Button variant="outline" className="w-full">Sign out</Button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
}
