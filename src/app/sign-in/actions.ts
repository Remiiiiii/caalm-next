'use server';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/lib/actions/user.actions';

export async function signInHandler(email: string) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('User not found');
  // verifySecret will set the session cookie if successful

  // Redirect based on user role
  switch (user.role) {
    case 'executive':
      redirect('/dashboard/executive');
    case 'manager':
      redirect('/dashboard/manager');
    case 'admin':
      redirect('/dashboard/admin');
    default:
      redirect('/');
  }
}
