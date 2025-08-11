import HRDashboard from '../HRDashboard';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export default async function HRDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <HRDashboard />;
}
