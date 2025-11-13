export const dynamic = 'force-dynamic';

import RolesManagement from './RolesManagement';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export default async function RolesManagementPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <RolesManagement />;
}

