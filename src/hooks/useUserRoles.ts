'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

interface UserRole {
  roleId: string;
  roleName: string | null;
}

interface UseUserRolesResult {
  roles: UserRole[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch user's roles from the database
 */
export function useUserRoles(): UseUserRolesResult {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.$id) {
      setRoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchRoles = async () => {
      try {
        const url = `/api/users/${user.$id}/roles${orgId ? `?orgId=${orgId}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data?.roles) {
          const userRoles = data.data.roles.map((role: any) => ({
            roleId: role.$id,
            roleName: role.name || null,
          }));
          setRoles(userRoles);
          setError(null);
        } else {
          throw new Error(data.error || 'Failed to fetch roles');
        }
      } catch (err) {
        console.error('[useUserRoles] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user?.$id, orgId]);

  return { roles, loading, error };
}

