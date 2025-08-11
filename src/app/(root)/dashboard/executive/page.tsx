import ExecutiveDashboard from '../ExecutiveDashboard';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export default async function ExecutiveDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <ExecutiveDashboard user={currentUser} />;
}
