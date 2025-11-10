'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeUserRole, UserRole } from '@/constants/rbac';

interface UserRoleDetails {
  role: UserRole;
  division?: string;
  fullName?: string;
  userId?: string;
  accountId?: string;
  loading: boolean;
  error: string | null;
}

export const useUserRole = (): UserRoleDetails => {
  const { user, loading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  type AuthenticatedUserLike = {
    role?: string;
    division?: string;
    name?: string;
    $id?: string;
    accountId?: string;
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const typedUser = (user ?? null) as AuthenticatedUserLike | null;

  // Always return the same structure, but conditionally show data
  return {
    role:
      isClient && typedUser
        ? normalizeUserRole(typedUser.role || '')
        : normalizeUserRole(null),
    division: isClient && typedUser ? typedUser.division || '' : '',
    fullName: isClient && typedUser ? typedUser.name || '' : '',
    userId: isClient && typedUser ? typedUser.$id || '' : '',
    accountId:
      isClient && typedUser
        ? typedUser.accountId || typedUser.$id || ''
        : '',
    loading: !isClient || authLoading,
    error: null,
  };
};
