/**
 * IT Context
 * Centralized state management for IT dashboard
 * Provides user role, department, real-time connection status, and dashboard metrics
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { getCurrentUser, getCurrentUserFrom2FA } from '@/lib/actions/user.actions';
import { getUserRoles, getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { realtimeService, type ConnectionStatus } from '@/lib/services/realtime-service';

interface ITUser {
  $id: string;
  fullName?: string;
  email?: string;
  department?: string;
  roleName: string;
}

interface ITContextType {
  user: ITUser | null;
  department: string | null;
  roleName: string | null;
  loading: boolean;
  realtimeStatus: ConnectionStatus;
  refreshUser: () => Promise<void>;
}

const ITContext = createContext<ITContextType | undefined>(undefined);

export const ITProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ITUser | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<ConnectionStatus>(
    realtimeService.getConnectionStatus()
  );

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // Try to get user from session first, then fall back to 2FA
      let currentUser = await getCurrentUser();
      if (!currentUser) {
        currentUser = await getCurrentUserFrom2FA();
      }

      if (!currentUser) {
        setUser(null);
        setDepartment(null);
        setRoleName(null);
        setLoading(false);
        return;
      }

      // Get user's role and department
      const defaultOrg = await getUserDefaultOrganization(currentUser.$id);
      if (defaultOrg) {
        const userRoles = await getUserRoles(currentUser.$id, defaultOrg.orgId);
        const itRole = userRoles.find((role) => role.roleName === 'IT');

        if (itRole) {
          setUser({
            $id: currentUser.$id,
            fullName: currentUser.fullName,
            email: currentUser.email,
            department: currentUser.division || null,
            roleName: 'IT',
          });
          setDepartment(currentUser.division || null);
          setRoleName('IT');
        } else {
          // User doesn't have IT role
          setUser(null);
          setDepartment(null);
          setRoleName(null);
        }
      } else {
        setUser(null);
        setDepartment(null);
        setRoleName(null);
      }
    } catch (error) {
      console.error('[ITContext] Error fetching user data:', error);
      setUser(null);
      setDepartment(null);
      setRoleName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to real-time connection status
  useEffect(() => {
    const unsubscribe = realtimeService.onStatusChange((status) => {
      setRealtimeStatus(status);
    });

    // Set initial status
    setRealtimeStatus(realtimeService.getConnectionStatus());

    return unsubscribe;
  }, []);

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const refreshUser = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  return (
    <ITContext.Provider
      value={{
        user,
        department,
        roleName,
        loading,
        realtimeStatus,
        refreshUser,
      }}
    >
      {children}
    </ITContext.Provider>
  );
};

export const useIT = () => {
  const context = useContext(ITContext);
  
  // Always return the same structure to ensure consistent hook calls
  // Don't throw - return default values instead
  if (context) {
    return context;
  }
  
  return {
    user: null,
    department: null,
    roleName: null,
    loading: true,
    realtimeStatus: 'disconnected' as ConnectionStatus,
    refreshUser: async () => undefined,
  };
};
