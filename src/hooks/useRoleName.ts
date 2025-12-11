'use client';

import { useState, useEffect } from 'react';

interface UseRoleNameOptions {
  userId?: string | null;
}

/**
 * Hook to get role display name for a user
 * Fetches from API using userId
 */
export function useRoleName({ userId }: UseRoleNameOptions): {
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
          const url = `/api/users/${userId}/role`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.success && data.roleName) {
            setRoleName(data.roleName);
          } else {
            setRoleName('');
          }
        } catch (error) {
          console.error('[useRoleName] Error fetching role name:', error);
          setRoleName('');
        }
      } else {
        setRoleName('');
      }
      
      setLoading(false);
    };

    fetchRoleName();
  }, [userId]);

  return { roleName, loading };
}

