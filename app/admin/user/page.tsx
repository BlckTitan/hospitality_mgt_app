'use client';

import { BackLink } from '../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
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
      <header className="w-full border-b mb-4">
        <div className="flex justify-between items-center">
          <h3>User Management</h3>
          <div className="flex items-center gap-3">
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
        </div>
        <p className="text-sm text-gray-600 mt-2 mb-0">
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
              Invite new people with a defined role and property. After they accept,
              manage extra properties or role changes from the user&apos;s edit page —
              the same email cannot be invited again.
            </p>
          </header>
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
