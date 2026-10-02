'use client'

import { BackLink } from '../../../../shared/pageHeader';
import Attendance from './components/attendance';
import { ShiftPageGuide } from '../components/shiftPageGuide';

export default function AttendancePage() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Tracker</h1>
        <ShiftPageGuide page="attendance" />
      </div>
        <BackLink />
      </header>
      <Attendance />
    </div>
  );
}
