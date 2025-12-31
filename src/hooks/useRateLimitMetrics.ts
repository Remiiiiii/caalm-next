/**
 * Hook for fetching rate limit metrics
 */

import useSWR from 'swr';
import { swrConfig } from '@/lib/swr-config';

export interface RateLimitMetricsData {
  summary: {
    totalRequests: number;
    blockedRequests: number;
    violations: number;
    efficiency: string;
    averageLatency: string;
  };
  topViolators: Array<{ identifier: string; count: number }>;
  endpointStats: Record<string, { requests: number; violations: number }>;
  violationStats?: {
    count: number;
    firstViolation: number;
    lastViolation: number;
    banCount: number;
  } | null;
  timestamp: string;
}

interface UseRateLimitMetricsOptions {
  endpoint?: string;
  identifier?: string;
  enableRealTime?: boolean;
  pollingInterval?: number;
}

const fetcher = async (url: string): Promise<RateLimitMetricsData> => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch rate limit metrics');
  }
  const data = await response.json();
  if (!data.success || !data.data) {
    throw new Error('Invalid response format');
  }
  return data.data;
};

export const useRateLimitMetrics = ({
  endpoint,
  identifier,
  enableRealTime = true,
  pollingInterval = 10000, // 10 seconds for rate limit metrics
}: UseRateLimitMetricsOptions = {}) => {
  // Build query string
  const params = new URLSearchParams();
  if (endpoint) params.append('endpoint', endpoint);
  if (identifier) params.append('identifier', identifier);
  const queryString = params.toString();
  const key = `/api/admin/rate-limits/metrics${queryString ? `?${queryString}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(key, fetcher, {
    ...swrConfig,
    refreshInterval: enableRealTime ? pollingInterval : 0,
    revalidateOnFocus: true,
  });

  const refresh = () => mutate();

  const resetMetrics = async () => {
    const response = await fetch('/api/admin/rate-limits/metrics', {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to reset metrics');
    }
    await mutate();
  };

  return {
    metrics: data,
    isLoading,
    error: error ? 'Failed to load rate limit metrics' : null,
    refresh,
    resetMetrics,
  };
};
