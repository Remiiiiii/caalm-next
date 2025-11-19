/**
 * usePermissions Hook
 * React hook for permission checking in components
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { PermissionKey } from '@/constants/permissions';
import { useState, useEffect } from 'react';

interface UsePermissionsResult {
  permissions: PermissionKey[];
  hasPermission: (key: PermissionKey) => Promise<boolean>;
  hasAnyPermission: (keys: PermissionKey[]) => Promise<boolean>;
  hasAllPermissions: (keys: PermissionKey[]) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function usePermissions(): UsePermissionsResult {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.$id) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchPermissions = async () => {
      try {
        const url = `/api/permissions/check${orgId ? `?orgId=${orgId}` : ''}`;
        
        // Use request deduplication to prevent concurrent requests
        const { deduplicateRequest } = await import('@/lib/utils/request-deduplication');
        const cacheKey = `permissions:${user.$id}:${orgId || 'default'}`;
        
        const data = await deduplicateRequest(cacheKey, async () => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('Failed to fetch permissions');
          }
          return response.json();
        });

        if (data.success) {
          setPermissions(data.permissions || []);
          setError(null);
        } else {
          throw new Error(data.error || 'Failed to fetch permissions');
        }
      } catch (err) {
        console.error('[usePermissions] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.$id, orgId]);

  const checkPermission = useMemo(
    () => async (key: PermissionKey) => {
      if (!user?.$id || !permissions.length) return false;
      return permissions.includes(key);
    },
    [user?.$id, permissions]
  );

  const checkAnyPermission = useMemo(
    () => async (keys: PermissionKey[]) => {
      if (!user?.$id || !permissions.length) return false;
      return keys.some((key) => permissions.includes(key));
    },
    [user?.$id, permissions]
  );

  const checkAllPermissions = useMemo(
    () => async (keys: PermissionKey[]) => {
      if (!user?.$id || !permissions.length) return false;
      return keys.every((key) => permissions.includes(key));
    },
    [user?.$id, permissions]
  );

  return {
    permissions,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    loading,
    error,
  };
}

