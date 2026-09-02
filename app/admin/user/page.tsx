'use client';

import React, { useState } from 'react';
import Users from './components/users';
import PendingInvites from './components/pendingInvites';

export default function UserPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex flex-col gap-2 mb-4">
        <h3>User Management</h3>
        <p className="text-sm text-gray-600 mb-0">
          Manage users and invitations. New users are created via invitation.
        </p>
      </header>

      <div className="mb-4">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'invites'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Pending Invitations
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div>
          <header className="w-full flex flex-col gap-2 mb-4">
            <p className="text-sm text-gray-600 mb-0">
              Click "Invite User" to send an invitation. When the recipient accepts,
              they'll be automatically assigned their role and property access.
            </p>
          </header>
          <Users />
        </div>
      )}

      {activeTab === 'invites' && (
        <PendingInvites />
      )}
    </div>
  );
}
