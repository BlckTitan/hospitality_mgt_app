'use client'

import Attendance from './components/attendance';

export default function AttendancePage() {
  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4">
        <h3>Attendance Tracker</h3>
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Logging in does not start your shift. Open this page, then click Start shift when you begin work
        and End shift when you finish. Hours are recorded when you end the shift and still need supervisor approval before payroll.
      </p>
      <Attendance />
    </div>
  );
}
