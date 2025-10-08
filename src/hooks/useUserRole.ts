'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/lib/actions/user.actions';

interface UserRole {
  role: string;
  division?: string;
  fullName?: string;
  loading: boolean;
  error: string | null;
}

export const useUserRole = (): UserRole => {
  const { user, loading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always return the same structure, but conditionally show data
  return {
    role: isClient && user ? (user as any).role || '' : '',
    division: isClient && user ? (user as any).division || '' : '',
    fullName: isClient && user ? user.name || '' : '',
    loading: !isClient || authLoading,
    error: null,
  };
};
