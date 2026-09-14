import { redirect } from 'next/navigation';

export default function PayrollHoursRedirect() {
  redirect('/admin/shift-management/hours');
}
