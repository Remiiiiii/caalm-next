import React from 'react';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return (
    <AuthenticatedLayout user={currentUser}>{children}</AuthenticatedLayout>
  );
};

export default Layout;
