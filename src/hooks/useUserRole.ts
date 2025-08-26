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

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const currentUser = await getCurrentUser();

        if (!currentUser) {
          setError('No user data found in database');
          return;
        }

        setRole(currentUser.role || '');
        setDivision(currentUser.division || '');
        setFullName(currentUser.fullName || '');
        setError(null);
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError('Failed to fetch user role');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return {
    role,
    division,
    fullName,
    loading,
    error,
  };
};
