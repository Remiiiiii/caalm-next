'use server';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/lib/actions/user.actions';

export async function signInHandler(email: string) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('User not found');
  // verifySecret will set the session cookie if successful

  // All users must complete 2FA setup before accessing the application
  // Redirect to settings to complete mandatory 2FA setup
  switch (user.role) {
    case 'executive':
      redirect('/settings');
    case 'manager':
      redirect('/settings');
    case 'admin':
      redirect('/settings');
    default:
      redirect('/settings');
  }
}
