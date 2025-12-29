'use client';

import useSWR from 'swr';
import type { UIFileDoc } from '@/types/files';

interface ContractsResponse {
  data: UIFileDoc[];
  requestId?: string;
}

const fetcher = async (url: string): Promise<UIFileDoc[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch contracts');
  }
  const result: ContractsResponse = await response.json();
  return result.data || [];
};

/**
 * Hook to fetch contracts from /api/contracts/all endpoint
 */
export function useContractsExpiring() {
  const { data, error, isLoading, mutate } = useSWR<UIFileDoc[]>(
    '/api/contracts/all',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  );

  return {
    contracts: Array.isArray(data) ? data : [],
    isLoading,
    error,
    refresh: mutate,
  };
}
