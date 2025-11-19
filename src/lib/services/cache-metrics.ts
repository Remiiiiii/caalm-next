/**
 * Cache Performance Metrics
 * Tracks cache hit rates and performance metrics
 */

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  avgHitTime: number;
  avgMissTime: number;
  totalRequests: number;
}

interface MetricsByKey {
  [key: string]: CacheMetrics;
}

class CacheMetricsService {
  private metrics: MetricsByKey = {};
  private readonly MAX_ENTRIES = 1000; // Limit memory usage

  /**
   * Record a cache hit
   */
  recordHit(key: string, duration: number): void {
    const metric = this.getOrCreateMetric(key);
    metric.hits++;
    metric.totalRequests++;
    metric.avgHitTime = this.calculateAverage(
      metric.avgHitTime,
      metric.hits,
      duration
    );
    metric.hitRate = metric.hits / metric.totalRequests;
  }

  /**
   * Record a cache miss
   */
  recordMiss(key: string, duration: number): void {
    const metric = this.getOrCreateMetric(key);
    metric.misses++;
    metric.totalRequests++;
    metric.avgMissTime = this.calculateAverage(
      metric.avgMissTime,
      metric.misses,
      duration
    );
    metric.hitRate = metric.hits / metric.totalRequests;
  }

  /**
   * Get metrics for a specific key
   */
  getMetrics(key: string): CacheMetrics | null {
    return this.metrics[key] || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): MetricsByKey {
    return { ...this.metrics };
  }

  /**
   * Get aggregated metrics across all keys
   */
  getAggregatedMetrics(): CacheMetrics {
    const keys = Object.keys(this.metrics);
    if (keys.length === 0) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgHitTime: 0,
        avgMissTime: 0,
        totalRequests: 0,
      };
    }

    const aggregated = keys.reduce(
      (acc, key) => {
        const metric = this.metrics[key];
        acc.hits += metric.hits;
        acc.misses += metric.misses;
        acc.totalRequests += metric.totalRequests;
        acc.avgHitTime += metric.avgHitTime * metric.hits;
        acc.avgMissTime += metric.avgMissTime * metric.misses;
        return acc;
      },
      {
        hits: 0,
        misses: 0,
        avgHitTime: 0,
        avgMissTime: 0,
        totalRequests: 0,
      }
    );

    const totalHits = aggregated.hits;
    const totalMisses = aggregated.misses;

    return {
      hits: aggregated.hits,
      misses: aggregated.misses,
      hitRate: aggregated.totalRequests > 0 
        ? aggregated.hits / aggregated.totalRequests 
        : 0,
      avgHitTime: totalHits > 0 ? aggregated.avgHitTime / totalHits : 0,
      avgMissTime: totalMisses > 0 ? aggregated.avgMissTime / totalMisses : 0,
      totalRequests: aggregated.totalRequests,
    };
  }

  /**
   * Clear metrics for a specific key
   */
  clearMetrics(key: string): void {
    delete this.metrics[key];
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.metrics = {};
  }

  /**
   * Get or create metric for a key
   */
  private getOrCreateMetric(key: string): CacheMetrics {
    if (!this.metrics[key]) {
      // Clean up old entries if we're at the limit
      if (Object.keys(this.metrics).length >= this.MAX_ENTRIES) {
        this.cleanupOldEntries();
      }

      this.metrics[key] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgHitTime: 0,
        avgMissTime: 0,
        totalRequests: 0,
      };
    }
    return this.metrics[key];
  }

  /**
   * Calculate running average
   */
  private calculateAverage(
    currentAvg: number,
    count: number,
    newValue: number
  ): number {
    if (count === 1) return newValue;
    return (currentAvg * (count - 1) + newValue) / count;
  }

  /**
   * Clean up old entries (remove least recently used)
   */
  private cleanupOldEntries(): void {
    const keys = Object.keys(this.metrics);
    const toRemove = keys.length - this.MAX_ENTRIES + 100; // Remove 100 extra

    // Sort by total requests (keep most active)
    const sorted = keys.sort((a, b) => {
      const metricA = this.metrics[a];
      const metricB = this.metrics[b];
      return metricB.totalRequests - metricA.totalRequests;
    });

    // Remove least active entries
    for (let i = sorted.length - toRemove; i < sorted.length; i++) {
      delete this.metrics[sorted[i]];
    }
  }
}

// Global instance
export const cacheMetrics = new CacheMetricsService();

/**
 * Record cache hit
 */
export function recordCacheHit(key: string, duration: number): void {
  cacheMetrics.recordHit(key, duration);
}

/**
 * Record cache miss
 */
export function recordCacheMiss(key: string, duration: number): void {
  cacheMetrics.recordMiss(key, duration);
}

/**
 * Get cache metrics
 */
export function getCacheMetrics(key?: string): CacheMetrics | MetricsByKey {
  if (key) {
    return cacheMetrics.getMetrics(key) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      totalRequests: 0,
    };
  }
  return cacheMetrics.getAllMetrics();
}

/**
 * Get aggregated cache metrics
 */
export function getAggregatedCacheMetrics(): CacheMetrics {
  return cacheMetrics.getAggregatedMetrics();
}

