import React from 'react';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return <ClientLayout user={currentUser}>{children}</ClientLayout>;
};

export default Layout;
