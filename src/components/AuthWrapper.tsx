'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/user.actions';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Models } from 'appwrite';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/sign-in');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/sign-in');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Always render the same structure, but conditionally show content
  return (
    <>
      {loading ? (
        <div>Loading...</div> // You can replace this with a proper loading component
      ) : !user ? null : (
        <AuthenticatedLayout user={user}>{children}</AuthenticatedLayout>
      )}
    </>
  );
};

export default AuthWrapper;
