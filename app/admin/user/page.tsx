'use client';

import { BackLink } from '../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../shared/button';
import Users from './components/users';
import PendingInvites from './components/pendingInvites';
import BootstrapModal from '../../../shared/modal';
import { InviteUserForm } from './components/inviteUserForm';
import { usePermissions } from '../../../hooks/usePermissions';

export default function UserPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canInvite = hasGranularPermission('users.create');

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600">
            Manage users and invitations. New users are created via invitation.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <BackLink />
          {activeTab === 'users' && canInvite && (
            <Button
              variant="primary"
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Invite User
            </Button>
          )}
        </div>
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
          <p className="text-sm text-gray-600 mb-4">
            Invite new people with a defined role and property. After they accept,
            manage extra properties or role changes from the user&apos;s edit page —
            the same email cannot be invited again.
          </p>
          <Users />
        </div>
      )}

      {activeTab === 'invites' && (
        <PendingInvites />
      )}

      <BootstrapModal
        show={showInviteModal}
        onHide={() => setShowInviteModal(false)}
        heading="Invite New User"
        body={
          <InviteUserForm
            onSuccess={() => setShowInviteModal(false)}
            onClose={() => setShowInviteModal(false)}
          />
        }
      />
    </div>
  );
}
