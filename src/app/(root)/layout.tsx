'use client';

import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import Sidebar from '@/components/Sidebar';
import MobileNavigation from '@/components/MobileNavigation';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const LayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isSessionValid } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to allow AuthContext to properly validate 2FA sessions
    const timer = setTimeout(() => {
      if (!loading && !user && !isSessionValid) {
        console.log('Layout: Redirecting to sign-in - no valid session found');
        router.push('/sign-in');
      }
    }, 1000); // 1 second delay to allow session validation

    return () => clearTimeout(timer);
  }, [user, loading, isSessionValid, router]);

  // Always render the same structure, but conditionally show content
  return (
    <>
      {loading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : !user ? (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to sign in...</p>
          </div>
        </div>
      ) : (
        <main className="flex h-screen">
          <Sidebar {...user} />
          <section className="flex h-full w-full flex-1 flex-col">
            <MobileNavigation {...user} />
            <DashboardHeader user={user} />
            <div className="main-content">{children}</div>
          </section>
          <Toaster />
        </main>
      )}
    </>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <LayoutContent>{children}</LayoutContent>
      </OrganizationProvider>
    </AuthProvider>
  );
};

export default Layout;
