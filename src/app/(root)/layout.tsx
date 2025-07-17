import React from 'react';
import Sidebar from '@/components/Sidebar';
import MobileNavigation from '@/components/MobileNavigation';
import DashboardHeader from '@/components/DashboardHeader';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { avatarPlaceholderUrl } from '../../../constants';

const layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return (
    <main className="flex h-screen">
      <Sidebar
        fullName={currentUser.name || 'Unknown User'}
        avatar={currentUser.prefs?.avatar || avatarPlaceholderUrl}
        email={currentUser.email}
        role={currentUser.role || 'manager'}
      />
      <section className="flex h-full w-full flex-1 flex-col">
        <MobileNavigation
          $id={currentUser.$id}
          accountId={currentUser.accountId}
          fullName={currentUser.fullName || currentUser.name || 'Unknown User'}
          avatar={currentUser.prefs?.avatar || avatarPlaceholderUrl}
          email={currentUser.email}
          role={currentUser.role || 'manager'}
        />
        <DashboardHeader user={currentUser} />
        <div className="main-content">{children}</div>
      </section>
      <Toaster />
    </main>
  );
};

export default layout;
