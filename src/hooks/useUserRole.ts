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
  const { user } = useAuth();
  const [role, setRole] = useState<string>('');
  const [division, setDivision] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent hydration issues by checking if we're on the client
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // Don't run on server side

    const fetchUserRole = async () => {
      console.log('useUserRole - fetchUserRole called, user:', user);

      if (!user) {
        console.log('useUserRole - No user, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        console.log('useUserRole - Starting to fetch user role...');
        setLoading(true);
        const currentUser = await getCurrentUser();

        // Debug logging
        console.log('useUserRole - getCurrentUser result:', currentUser);

        if (!currentUser) {
          console.log('useUserRole - No currentUser found, setting error');
          setError('No user data found in database');
          return;
        }

        // Debug logging for user data
        console.log('useUserRole - User data:', {
          role: currentUser.role,
          division: currentUser.division,
          fullName: currentUser.fullName,
          accountId: currentUser.accountId,
        });

        setRole(currentUser.role || '');
        setDivision(currentUser.division || '');
        setFullName(currentUser.fullName || '');
        setError(null);
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError('Failed to fetch user role');
      } finally {
        console.log('useUserRole - Setting loading to false');
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, isClient]);

  return {
    role: isClient ? role : '',
    division: isClient ? division : '',
    fullName: isClient ? fullName : '',
    loading: !isClient || loading,
    error: isClient ? error : null,
  };
};
