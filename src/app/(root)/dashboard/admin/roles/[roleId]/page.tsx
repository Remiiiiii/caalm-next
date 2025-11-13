export const dynamic = 'force-dynamic';

import RoleDetail from './RoleDetail';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export default async function RoleDetailPage({
  params,
}: {
  params: { roleId: string };
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <RoleDetail roleId={params.roleId} />;
}

