'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import MobileNavigation from '@/components/MobileNavigation';
import DashboardHeader from '@/components/DashboardHeader';
import QuickActions from '@/components/QuickActions';
import InactivityDialog from '@/components/InactivityDialog';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

import { Toaster } from '@/components/ui/toaster';
import { avatarPlaceholderUrl } from '../../constants';
import { Models } from 'appwrite';

type ExtendedUser = Models.User<Models.Preferences> & {
  name?: string;
  role?: 'executive' | 'admin' | 'manager';
  accountId?: string;
  fullName?: string;
  department?: string;
  prefs?: {
    avatar?: string;
  };
};

interface AuthenticatedLayoutProps {
  user: Models.User<Models.Preferences>;
  children: React.ReactNode;
}

const AuthenticatedLayout = ({
  user: serverUser,
  children,
}: AuthenticatedLayoutProps) => {
  // For now, just use the server user to avoid hydration issues
  const currentUser = serverUser;
  const user = currentUser as ExtendedUser;

  // Initialize inactivity timer
  const { showDialog, handleContinue, handleLogout, handleClose } =
    useInactivityTimer();

  return (
    <main className="flex h-screen">
      <Sidebar
        fullName={user.name || 'Unknown User'}
        avatar={user.prefs?.avatar || avatarPlaceholderUrl}
        email={currentUser.email}
        role={user.role || 'manager'}
        department={user.department}
      />
      <section className="flex h-full w-full flex-1 flex-col">
        <MobileNavigation
          $id={currentUser.$id}
          accountId={user.accountId || currentUser.$id}
          fullName={user.fullName || user.name || 'Unknown User'}
          avatar={user.prefs?.avatar || avatarPlaceholderUrl}
          email={currentUser.email}
          role={user.role || 'manager'}
        />
        <div className="flex justify-between items-center px-4">
          <QuickActions user={currentUser} />
          <DashboardHeader user={currentUser} />
        </div>
        <div className="main-content">{children}</div>
      </section>
      <Toaster />

      {/* Inactivity Dialog */}
      <InactivityDialog
        isOpen={showDialog}
        onClose={handleClose}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </main>
  );
};

export default AuthenticatedLayout;
