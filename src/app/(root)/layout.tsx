import React from 'react';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import Sidebar from '@/components/Sidebar';
import MobileNavigation from '@/components/MobileNavigation';
import DashboardHeader from '@/components/DashboardHeader';

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  return (
    <AuthProvider>
      <OrganizationProvider>
        <main className="flex h-screen">
          <Sidebar {...currentUser} />
          <section className="flex h-full w-full flex-1 flex-col">
            <MobileNavigation {...currentUser} />
            <DashboardHeader user={currentUser} />
            <div className="main-content">{children}</div>
          </section>
          <Toaster />
        </main>
      </OrganizationProvider>
    </AuthProvider>
  );
};

export default Layout;
