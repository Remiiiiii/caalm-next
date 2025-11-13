'use client';

import { useState, useEffect } from 'react';
import { getLegacyRoleDisplayName } from '@/lib/utils/role-display';

interface UseRoleNameOptions {
  userId?: string | null;
  legacyRole?: string | null;
}

/**
 * Hook to get role display name for a user
 * Fetches from API using userId, falls back to legacy role mapping
 */
export function useRoleName({ userId, legacyRole }: UseRoleNameOptions): {
  roleName: string;
  loading: boolean;
} {
  const [roleName, setRoleName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoleName = async () => {
      setLoading(true);
      
      if (userId) {
        try {
          const url = `/api/users/${userId}/role${legacyRole ? `?legacyRole=${encodeURIComponent(legacyRole)}` : ''}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.success && data.roleName) {
            setRoleName(data.roleName);
          } else {
            // Fallback to legacy mapping
            setRoleName(getLegacyRoleDisplayName(legacyRole || ''));
          }
        } catch (error) {
          console.error('[useRoleName] Error fetching role name:', error);
          // Fallback to legacy mapping
          setRoleName(getLegacyRoleDisplayName(legacyRole || ''));
        }
      } else if (legacyRole) {
        // Use legacy role mapping directly
        setRoleName(getLegacyRoleDisplayName(legacyRole));
      } else {
        setRoleName('');
      }
      
      setLoading(false);
    };

    fetchRoleName();
  }, [userId, legacyRole]);

  return { roleName, loading };
}

