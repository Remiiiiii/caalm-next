export const dynamic = 'force-dynamic';

import AdminDashboard from '../AdminDashboard';
import {
  getCurrentUser,
  getCurrentUserFrom2FA,
} from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  // Try to get user from session first, then fall back to 2FA-based auth
  let currentUser = await getCurrentUser();

  if (!currentUser) {
    // If no session-based user, try 2FA-based user
    currentUser = await getCurrentUserFrom2FA();
  }

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <AdminDashboard />;
}
