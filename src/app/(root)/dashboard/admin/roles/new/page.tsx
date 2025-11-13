export const dynamic = 'force-dynamic';

import CreateRole from './CreateRole';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export default async function CreateRolePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <CreateRole />;
}

