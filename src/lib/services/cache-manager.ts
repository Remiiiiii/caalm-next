/**
 * High-level cache manager for API routes
 * Provides convenient wrapper functions for common caching patterns
 */

import * as cache from './redis-cache';
import { CACHE_KEYS, getTTLForRoute } from './cache-keys';

/**
 * Cache wrapper for API routes
 * Automatically handles cache key generation and TTL
 */
export class CacheManager {
  /**
   * Wrap an API route handler with caching
   */
  static async withCache<T>(
    route: string,
    key: string,
    fetchFn: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const ttl = customTTL || getTTLForRoute(route);
    return cache.getOrSet<T>(key, fetchFn, ttl);
  }

  /**
   * Invalidate cache for a specific key
   */
  static async invalidate(key: string): Promise<void> {
    await cache.del(key);
  }

  /**
   * Invalidate multiple cache keys (pattern-based)
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    await cache.clear(pattern);
  }

  /**
   * Invalidate dashboard cache
   */
  static async invalidateDashboard(
    orgId: string,
    userId: string
  ): Promise<void> {
    await cache.del(CACHE_KEYS.dashboard.unified(orgId, userId));
    await cache.del(CACHE_KEYS.dashboard.stats(orgId));
  }

  /**
   * Invalidate analytics cache
   */
  static async invalidateAnalytics(userId?: string): Promise<void> {
    if (userId) {
      await cache.del(CACHE_KEYS.analytics.unified(userId));
    } else {
      await cache.del(CACHE_KEYS.analytics.admin());
    }
  }

  /**
   * Invalidate calendar cache
   */
  static async invalidateCalendar(
    year?: number,
    month?: number
  ): Promise<void> {
    if (year && month) {
      await cache.del(CACHE_KEYS.calendar.events(year, month));
    } else {
      // Invalidate all calendar events
      await cache.clear('^calendar:events:');
    }
  }

  /**
   * Invalidate notifications cache
   */
  static async invalidateNotifications(userId: string): Promise<void> {
    await cache.del(CACHE_KEYS.notifications.user(userId));
    await cache.del(CACHE_KEYS.notifications.stats(userId));
    await cache.del(CACHE_KEYS.notifications.unreadCount(userId));
  }

  /**
   * Invalidate contracts cache
   */
  static async invalidateContracts(userId?: string): Promise<void> {
    if (userId) {
      await cache.del(CACHE_KEYS.contracts.user(userId));
    }
    await cache.del(CACHE_KEYS.contracts.all());
    await cache.del(CACHE_KEYS.contracts.expirations());
  }

  /**
   * Invalidate reports cache
   */
  static async invalidateReports(userId: string): Promise<void> {
    await cache.del(CACHE_KEYS.reports.user(userId));
    await cache.del(CACHE_KEYS.reports.templates());
  }

  /**
   * Invalidate users cache
   */
  static async invalidateUsers(): Promise<void> {
    await cache.del(CACHE_KEYS.users.all());
    await cache.del(CACHE_KEYS.users.uninvited());
    // Clear search cache
    await cache.clear('^users:search:');
  }

  /**
   * Invalidate recent activities cache
   */
  static async invalidateRecentActivities(): Promise<void> {
    await cache.del(CACHE_KEYS.recentActivities());
  }

  /**
   * Invalidate audit logs cache
   */
  static async invalidateAudits(): Promise<void> {
    await cache.del(CACHE_KEYS.audits.stats());
    await cache.clear('^audits:logs:');
  }

  /**
   * Invalidate search cache
   */
  static async invalidateSearch(): Promise<void> {
    await cache.clear('^search:');
  }

  /**
   * Warm up cache with common data
   */
  static async warmUp(orgId: string, userId: string): Promise<void> {
    // This can be called on application startup or periodically
    // to pre-cache commonly accessed data
    console.log(`Warming up cache for org: ${orgId}, user: ${userId}`);

    // Add your warming logic here
    // Example: Pre-fetch dashboard stats, recent activities, etc.
  }
}

export default CacheManager;
