'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getContracts,
  getContractsForManager,
} from '@/lib/actions/file.actions';
import { Contract, UseMyContractsReturn } from '@/types/my-contracts';

export const useMyContracts = (): UseMyContractsReturn => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let contractsData: Contract[] = [];

      // Fetch contracts based on user role
      if (user.role === 'executive' || user.role === 'admin') {
        // Executives and admins can see all contracts
        const allContracts = await getContracts();
        contractsData = allContracts?.documents || [];
      } else if (user.role === 'manager') {
        // Managers can only see contracts assigned to them
        const managerContracts = await getContractsForManager(user.$id);
        contractsData = managerContracts || [];
      } else {
        // Other roles get no contracts
        contractsData = [];
      }

      setContracts(contractsData);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError('Failed to fetch contracts');
      setContracts(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user]);

  return {
    contracts,
    loading,
    error,
    refetch: fetchContracts,
  };
};
