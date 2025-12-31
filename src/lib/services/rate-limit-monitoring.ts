/**
 * Rate limit monitoring and logging service
 * Tracks violations, metrics, and performance
 */

import { get, set, del } from './redis-cache';

export interface RateLimitMetrics {
  violations: number;
  totalRequests: number;
  blockedRequests: number;
  averageLatency: number;
  topViolators: Array<{ identifier: string; count: number }>;
  endpointStats: Record<string, { requests: number; violations: number }>;
}

export interface ViolationLog {
  timestamp: number;
  endpoint: string;
  identifier: string;
  identifierType: 'user' | 'api-key' | 'ip';
  tier: string;
  limit: number;
  remaining: number;
  retryAfter?: number;
}

/**
 * Monitoring service for rate limiting
 */
export class RateLimitMonitoring {
  private readonly METRICS_KEY = 'ratelimit:metrics';
  private readonly VIOLATIONS_KEY = 'ratelimit:violations:log';
  private readonly METRICS_TTL = 86400; // 24 hours

  /**
   * Log a rate limit violation
   */
  async logViolation(log: ViolationLog): Promise<void> {
    try {
      const logKey = `${this.VIOLATIONS_KEY}:${Date.now()}:${log.identifier}`;
      await set(logKey, log, 3600); // Store for 1 hour

      // Update metrics
      await this.updateMetrics(log);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Rate Limit Violation]', {
          endpoint: log.endpoint,
          identifier: log.identifier,
          type: log.identifierType,
          limit: log.limit,
          remaining: log.remaining,
        });
      }
    } catch (error) {
      console.error('Error logging rate limit violation:', error);
    }
  }

  /**
   * Record a rate limit check (for metrics)
   */
  async recordCheck(
    endpoint: string,
    identifier: string,
    allowed: boolean,
    latency: number
  ): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      
      metrics.totalRequests++;
      if (!allowed) {
        metrics.blockedRequests++;
      }

      // Update average latency (simple moving average)
      const currentAvg = metrics.averageLatency || 0;
      const requestCount = metrics.totalRequests;
      metrics.averageLatency =
        (currentAvg * (requestCount - 1) + latency) / requestCount;

      // Update endpoint stats
      if (!metrics.endpointStats[endpoint]) {
        metrics.endpointStats[endpoint] = { requests: 0, violations: 0 };
      }
      metrics.endpointStats[endpoint].requests++;
      if (!allowed) {
        metrics.endpointStats[endpoint].violations++;
      }

      // Update top violators
      if (!allowed) {
        const violatorIndex = metrics.topViolators.findIndex(
          (v) => v.identifier === identifier
        );
        if (violatorIndex >= 0) {
          metrics.topViolators[violatorIndex].count++;
        } else {
          metrics.topViolators.push({ identifier, count: 1 });
        }
        // Sort and keep top 10
        metrics.topViolators.sort((a, b) => b.count - a.count);
        metrics.topViolators = metrics.topViolators.slice(0, 10);
      }

      await this.saveMetrics(metrics);
    } catch (error) {
      console.error('Error recording rate limit check:', error);
    }
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<RateLimitMetrics> {
    try {
      const metrics = await get<RateLimitMetrics>(this.METRICS_KEY);
      if (metrics && typeof metrics === 'object') {
        // Validate metrics structure
        return {
          violations: metrics.violations || 0,
          totalRequests: metrics.totalRequests || 0,
          blockedRequests: metrics.blockedRequests || 0,
          averageLatency: metrics.averageLatency || 0,
          topViolators: Array.isArray(metrics.topViolators) ? metrics.topViolators : [],
          endpointStats: metrics.endpointStats && typeof metrics.endpointStats === 'object' ? metrics.endpointStats : {},
        };
      }
    } catch (error) {
      console.error('Error getting metrics from cache:', error);
      // Continue to return default metrics
    }

    // Return default metrics
    return {
      violations: 0,
      totalRequests: 0,
      blockedRequests: 0,
      averageLatency: 0,
      topViolators: [],
      endpointStats: {},
    };
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(metrics: RateLimitMetrics): Promise<void> {
    try {
      await set(this.METRICS_KEY, metrics, this.METRICS_TTL);
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Update metrics with violation log
   */
  private async updateMetrics(log: ViolationLog): Promise<void> {
    const metrics = await this.getMetrics();
    metrics.violations++;

    // Update endpoint stats
    if (!metrics.endpointStats[log.endpoint]) {
      metrics.endpointStats[log.endpoint] = { requests: 0, violations: 0 };
    }
    metrics.endpointStats[log.endpoint].violations++;

    // Update top violators
    const violatorIndex = metrics.topViolators.findIndex(
      (v) => v.identifier === log.identifier
    );
    if (violatorIndex >= 0) {
      metrics.topViolators[violatorIndex].count++;
    } else {
      metrics.topViolators.push({ identifier: log.identifier, count: 1 });
    }
    // Sort and keep top 10
    metrics.topViolators.sort((a, b) => b.count - a.count);
    metrics.topViolators = metrics.topViolators.slice(0, 10);

    await this.saveMetrics(metrics);
  }

  /**
   * Reset metrics (admin function)
   */
  async resetMetrics(): Promise<void> {
    try {
      await del(this.METRICS_KEY);
    } catch (error) {
      console.error('Error resetting metrics:', error);
    }
  }

  /**
   * Get violation logs (recent)
   */
  async getRecentViolations(limit: number = 100): Promise<ViolationLog[]> {
    // Note: This is a simplified implementation
    // In production, you might want to use a time-series database
    // or structured logging system
    try {
      // For now, return empty array
      // In a real implementation, you would query stored logs
      return [];
    } catch (error) {
      console.error('Error getting recent violations:', error);
      return [];
    }
  }

  /**
   * Get endpoint statistics
   */
  async getEndpointStats(endpoint?: string): Promise<Record<string, { requests: number; violations: number }>> {
    const metrics = await this.getMetrics();
    if (endpoint) {
      return {
        [endpoint]: metrics.endpointStats[endpoint] || { requests: 0, violations: 0 },
      };
    }
    return metrics.endpointStats;
  }
}

/**
 * Global monitoring service instance
 */
export const rateLimitMonitoring = new RateLimitMonitoring();

export default rateLimitMonitoring;
