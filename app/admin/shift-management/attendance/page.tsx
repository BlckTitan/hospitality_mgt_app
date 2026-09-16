'use client'

import { BackLink } from '../../../../shared/pageHeader';
import Attendance from './components/attendance';
import { ShiftPageGuide } from '../components/shiftPageGuide';

export default function AttendancePage() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Attendance Tracker</h3>
        <BackLink />
      </header>
      <ShiftPageGuide page="attendance" />
      <Attendance />
    </div>
  );
}
