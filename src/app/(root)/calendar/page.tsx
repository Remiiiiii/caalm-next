export const dynamic = 'force-dynamic';

import {
  getCurrentUser,
  getCurrentUserFrom2FA,
} from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import OutlookStyleCalendar from '@/components/OutlookStyleCalendar';

export default async function CalendarPage() {
  // Try to get user from session first, then fall back to 2FA-based auth
  let currentUser = await getCurrentUser();
  if (!currentUser) {
    currentUser = await getCurrentUserFrom2FA();
  }

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <OutlookStyleCalendar user={currentUser} />;
}
