// src/components/ProtectedRoute.tsx
'use client';

import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [user, loading, router]);

  // Always render the same structure, but conditionally show content
  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          Loading...
        </div>
      ) : !user ? null : ( // Or a spinner
        children
      )}
    </>
  );
};

export default ProtectedRoute;
