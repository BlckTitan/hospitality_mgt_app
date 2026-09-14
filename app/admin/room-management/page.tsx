'use client';

import { BackLink } from '../../../shared/pageHeader';

export default function RoomManagementPage() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Room Management</h3>
        <BackLink />
      </header>
    </div>
  );
}
