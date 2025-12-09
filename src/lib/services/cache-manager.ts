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
   * When year and month are provided, invalidates all user-specific caches for that month
   * When no parameters, invalidates all calendar event caches
   */
  static async invalidateCalendar(
    year?: number,
    month?: number,
    userId?: string,
    orgId?: string
  ): Promise<void> {
    if (year && month) {
      // Invalidate all user-specific caches for this month
      // Pattern matches: calendar:events:*:year:month and calendar:events:year:month (legacy)
      await cache.clear(`^calendar:events:.*:${year}:${month}$`);
      await cache.clear(`^calendar:events:${year}:${month}$`);
    } else {
      // Invalidate all calendar events (all users, all months)
      await cache.clear('^calendar:events:');
    }
    
    // Invalidate shared calendars cache if userId and orgId provided
    if (userId && orgId) {
      await cache.del(CACHE_KEYS.calendar.shared(userId, orgId));
    } else if (userId) {
      // Invalidate all shared calendar caches for this user
      await cache.clear(`^calendar:shared:${userId}:`);
    } else {
      // Invalidate all shared calendar caches
      await cache.clear('^calendar:shared:');
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
  static async invalidateUsers(email?: string, userId?: string, accountId?: string, fullName?: string): Promise<void> {
    await cache.del(CACHE_KEYS.users.all());
    await cache.del(CACHE_KEYS.users.uninvited());
    // Clear search cache
    await cache.clear('^users:search:');
    // Clear get-by-ids cache (could be multiple keys due to hashing)
    await cache.clear('^users:byIds:');
    // Invalidate specific user caches if provided
    if (email) {
      await cache.del(CACHE_KEYS.users.byEmail(email));
      await cache.del(`user:email:${email.toLowerCase()}`);
    }
    if (userId) {
      await cache.del(CACHE_KEYS.users.single(userId));
    }
    if (accountId) {
      await cache.del(CACHE_KEYS.users.byAccountId(accountId));
    }
    if (fullName) {
      await cache.del(CACHE_KEYS.users.byFullName(fullName));
    }
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
   * Invalidate RBAC cache (permissions, roles, default org)
   */
  static async invalidateRBAC(userId?: string, orgId?: string): Promise<void> {
    if (userId) {
      // Invalidate all RBAC caches for this user
      await cache.del(CACHE_KEYS.rbac.defaultOrg(userId));
      if (orgId) {
        await cache.del(CACHE_KEYS.rbac.permissions(userId, orgId));
        await cache.del(CACHE_KEYS.rbac.userRoles(userId, orgId));
      } else {
        // Invalidate all orgs for this user
        await cache.clear(`^rbac:permissions:${userId}:`);
        await cache.clear(`^rbac:userRoles:${userId}:`);
      }
      await cache.del(CACHE_KEYS.rbac.userWithRoles(userId));
    } else {
      // Invalidate all RBAC caches
      await cache.clear('^rbac:');
    }
  }

  /**
   * Warm up cache with common data
   * This pre-fetches critical data to ensure fast initial page loads
   */
  static async warmUp(orgId: string, userId: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Warming up cache for org: ${orgId}, user: ${userId}`);
    }

    try {
      // Pre-fetch unified dashboard data in background
      // This ensures cache is populated before first user request
      const dashboardKey = CACHE_KEYS.dashboard.unified(orgId, userId);
      const existingCache = await import('./redis-cache').then(m => m.get(dashboardKey));
      
      // Only warm up if cache is empty or stale (older than 10 minutes)
      if (!existingCache || (existingCache.timestamp && (Date.now() - existingCache.timestamp) > 600000)) {
        // Fire and forget - don't block
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/unified?orgId=${orgId}&userId=${userId}`, {
          method: 'GET',
          headers: {
            'X-Warm-Up': 'true', // Special header to identify warm-up requests
          },
        }).catch(() => {
          // Silently fail - warm-up is non-critical
        });
      }
    } catch (error) {
      // Silently fail - warm-up should not break the app
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cache warm-up failed:', error);
      }
    }
  }
}

export default CacheManager;
