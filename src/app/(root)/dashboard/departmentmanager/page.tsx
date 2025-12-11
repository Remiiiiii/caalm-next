export const dynamic = 'force-dynamic';

import ManagerDashboard from '../ManagerDashboard';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export default async function DepartmentManagerDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <ManagerDashboard />;
}

