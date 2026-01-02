'use client';

import React, { Suspense, useMemo } from 'react';
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
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log(
      'Layout useEffect - loading:',
      loading,
      'user:',
      user ? 'Found' : 'Not found'
    );
    if (!loading && !user) {
      console.log('Layout: Redirecting to sign-in - no user found');
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // Memoize sidebar props - always return an object to ensure consistent rendering
  const sidebarProps = useMemo(() => {
    if (!user) {
      return {
        name: 'Loading...',
        avatar: '/assets/images/avatar-placeholder.png',
        email: '',
        role: '',
        division: '',
      };
    }
    return {
      name: user.name || 'Unknown User',
      avatar:
        (user as any).prefs?.avatar || '/assets/images/avatar-placeholder.png',
      email: user.email,
      role: (user as any).role || '',
      division: (user as any).division || '',
    };
  }, [
    user?.$id,
    user?.email,
    (user as any)?.name,
    (user as any)?.prefs?.avatar,
    (user as any)?.role,
    (user as any)?.division,
  ]);

  // Memoize navigation props - always return an object to ensure consistent rendering
  const navigationProps = useMemo(() => {
    if (!user) {
      return {
        $id: '',
        accountId: '',
        fullName: 'Loading...',
        avatar: '/assets/images/avatar-placeholder.png',
        email: '',
        role: '',
      };
    }
    return {
      $id: user.$id,
      accountId: (user as any).accountId || user.$id,
      fullName: (user as any).fullName || (user as any).name || 'Unknown User',
      avatar:
        (user as any).prefs?.avatar || '/assets/images/avatar-placeholder.png',
      email: user.email,
      role: (user as any).role || '',
    };
  }, [
    user?.$id,
    user?.email,
    (user as any)?.accountId,
    (user as any)?.fullName,
    (user as any)?.name,
    (user as any)?.prefs?.avatar,
    (user as any)?.role,
  ]);

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
        <main className="flex h-screen overflow-hidden">
          <Sidebar {...sidebarProps} />
          <section className="flex h-full flex-1 flex-col min-w-0">
            <MobileNavigation {...navigationProps} />
            <DashboardHeader user={user} />
            <div className="main-content">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading...</p>
                    </div>
                  </div>
                }
              >
                {children}
              </Suspense>
            </div>
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
