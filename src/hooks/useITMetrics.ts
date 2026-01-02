/**
 * Hook for fetching real-time IT metrics
 * Uses SSE for less critical metrics updates
 */

import { useState, useEffect, useRef } from 'react';
import { sseService, subscribeToSSE, type SSEConnectionStatus } from '@/lib/services/sse-service';

export interface ITMetrics {
  apiRequests: {
    total: number;
    perSecond: number;
    errors: number;
  };
  systemPerformance: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkTraffic: number;
  };
  deployments: {
    total: number;
    successful: number;
    failed: number;
    inProgress: number;
  };
  incidents: {
    active: number;
    resolved: number;
    critical: number;
  };
  timestamp: string;
}

export interface UseITMetricsOptions {
  enabled?: boolean;
  endpoint?: string;
}

export interface UseITMetricsReturn {
  metrics: ITMetrics | null;
  loading: boolean;
  error: Error | null;
  connectionStatus: SSEConnectionStatus;
  refresh: () => void;
}

/**
 * Hook for real-time IT metrics using SSE
 */
export function useITMetrics(
  options: UseITMetricsOptions = {}
): UseITMetricsReturn {
  const { enabled = true, endpoint = '/api/it/metrics/sse' } = options;
  
  const [metrics, setMetrics] = useState<ITMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('disconnected');
  const subscriptionRef = useRef<ReturnType<typeof subscribeToSSE> | null>(null);

  // Subscribe to connection status changes
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = sseService.onStatusChange(endpoint, (status) => {
      setConnectionStatus(status);
      if (status === 'error') {
        setError(new Error('SSE connection error'));
      } else if (status === 'connected') {
        setError(null);
      }
    });

    return unsubscribe;
  }, [enabled, endpoint]);

  // Subscribe to SSE endpoint
  useEffect(() => {
    if (!enabled) {
      return;
    }

    setLoading(true);

    const subscription = subscribeToSSE(endpoint, {
      onMessage: (data) => {
        try {
          setMetrics(data as ITMetrics);
          setError(null);
          setLoading(false);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);
        }
      },
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
      onConnect: () => {
        setError(null);
        setLoading(false);
      },
    });

    subscriptionRef.current = subscription;

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.close();
        subscriptionRef.current = null;
      }
    };
  }, [enabled, endpoint]);

  const refresh = () => {
    // Trigger a refresh by re-subscribing
    if (subscriptionRef.current) {
      subscriptionRef.current.close();
    }
    setLoading(true);
    // The useEffect will handle resubscription
  };

  return {
    metrics,
    loading,
    error,
    connectionStatus,
    refresh,
  };
}
