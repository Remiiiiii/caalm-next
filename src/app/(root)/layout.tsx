import React from 'react';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }
  
  return (
    <AuthProvider>
      <main className="flex h-screen">
        <Sidebar {...currentUser} />
        <section className="flex h-full w-full flex-1 flex-col">
          <MobileNavigation {...currentUser} />
          <DashboardHeader2
            userId={currentUser.$id}
            accountId={currentUser.accountId}
          />
          <div className="main-content">{children}</div>
        </section>
        <Toaster />
      </main>
    </AuthProvider>
  );
};

export default Layout;
