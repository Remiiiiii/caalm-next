/**
 * Hook for fetching IT user data with role and department
 */

import { useState, useEffect } from 'react';
import { getCurrentUser, getCurrentUserFrom2FA } from '@/lib/actions/user.actions';
import { getUserRoles, getUserDefaultOrganization } from '@/lib/rbac/permissions';

export interface ITUserData {
  userId: string;
  fullName?: string;
  email?: string;
  department: string | null;
  roleName: string;
}

export interface UseITUserReturn {
  user: ITUserData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch IT user data including role and department
 */
export function useITUser(): UseITUserReturn {
  const [user, setUser] = useState<ITUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get user from session first, then fall back to 2FA
      let currentUser = await getCurrentUser();
      if (!currentUser) {
        currentUser = await getCurrentUserFrom2FA();
      }

      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Get user's role and department
      const defaultOrg = await getUserDefaultOrganization(currentUser.$id);
      if (!defaultOrg) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userRoles = await getUserRoles(currentUser.$id, defaultOrg.orgId);
      const itRole = userRoles.find((role) => role.roleName === 'IT');

      if (itRole) {
        setUser({
          userId: currentUser.$id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          department: currentUser.division || null,
          roleName: 'IT',
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data';
      setError(errorMessage);
      console.error('[useITUser] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user,
    loading,
    error,
    refresh: fetchUser,
  };
}
