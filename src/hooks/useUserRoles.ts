'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getCachedData, setCachedData } from '@/lib/utils/client-cache';

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
 * Optimized with request deduplication and client-side caching
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

    // Check client-side cache first (stale-while-revalidate pattern)
    const cacheKey = `userRoles:${user.$id}:${orgId || 'default'}`;
    const cachedRoles = getCachedData<UserRole[]>(cacheKey);
    
    if (cachedRoles) {
      setRoles(cachedRoles);
      setLoading(false);
      // Continue fetching in background to update cache
    } else {
      setLoading(true);
    }

    const fetchRoles = async () => {
      let hasCachedData = !!cachedRoles;
      
      try {
        const url = `/api/users/${user.$id}/roles${orgId ? `?orgId=${orgId}` : ''}`;
        
        // Use request deduplication to prevent concurrent requests
        const { deduplicateRequest } = await import('@/lib/utils/request-deduplication');
        const requestKey = `userRoles:${user.$id}:${orgId || 'default'}`;
        
        const data = await deduplicateRequest(requestKey, async () => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('Failed to fetch roles');
          }
          return response.json();
        });

        if (data.success && data.data?.roles) {
          const userRoles = data.data.roles.map((role: any) => ({
            roleId: role.$id,
            roleName: role.name || null,
          }));
          
          // Cache for 5 minutes
          setCachedData(cacheKey, userRoles, 300000);
          
          setRoles(userRoles);
          setError(null);
        } else {
          throw new Error(data.error || 'Failed to fetch roles');
        }
      } catch (err) {
        console.error('[useUserRoles] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Don't clear roles if we have cached data
        if (!hasCachedData) {
          setRoles([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user?.$id, orgId]);

  return { roles, loading, error };
}

