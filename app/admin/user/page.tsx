'use client';

import React from 'react';
import Users from './components/users';

export default function UserPage() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex flex-col gap-2 mb-4">
        <h3>Users</h3>
        <p className="text-sm text-gray-600 mb-0">
          New users are created when they sign up through Clerk. Profile changes
          sync automatically via the Clerk webhook.
        </p>
      </header>

      <Users />
    </div>
  );
}
