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
    userId?: string
  ): Promise<void> {
    if (userId) {
      await cache.del(CACHE_KEYS.dashboard.unified(orgId, userId));
    }
    await cache.del(CACHE_KEYS.dashboard.stats(orgId));
    await cache.del(CACHE_KEYS.dashboard.invitations(orgId));
    // Clear all dashboard files caches (with different limits)
    await cache.clear(`^dashboard:files:${orgId}:`);
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
   * Invalidates all notification-related cache keys for a user, including all filter/page variations
   */
  static async invalidateNotifications(userId: string): Promise<void> {
    // Invalidate base keys
    await cache.del(CACHE_KEYS.notifications.user(userId));
    await cache.del(CACHE_KEYS.notifications.stats(userId));
    await cache.del(CACHE_KEYS.notifications.unreadCount(userId));
    
    // Also invalidate all variations with filters/pages using pattern matching
    // The cache key format is: notifications:user:${userId}:${page}:${limit}:${filters}
    const pattern = `notifications:user:${userId}:*`;
    await cache.clear(pattern);
    
    console.log(`[SERVER] Invalidated notification cache for userId: ${userId} (including pattern: ${pattern})`);
  }

  /**
   * Invalidate contracts cache
   */
  static async invalidateContracts(userId?: string, contractId?: string): Promise<void> {
    if (userId) {
      await cache.del(CACHE_KEYS.contracts.user(userId));
      await cache.del(CACHE_KEYS.contracts.manager(userId));
    }
    if (contractId) {
      await cache.del(CACHE_KEYS.contracts.details(contractId));
    }
    await cache.del(CACHE_KEYS.contracts.all());
    await cache.del(CACHE_KEYS.contracts.expirations());
    // Clear all contract database caches (pagination variations)
    await cache.clear('^contracts:database:');
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
      // Clear role caches for this user
      await cache.clear(`^users:role:${userId}`);
      await cache.clear(`^users:roleName:${userId}`);
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
    // Clear all recent activities with any limit
    await cache.clear('^recent-activities');
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
        // Invalidate all orgs for this user (including no-orgId keys)
        // Pattern matches: rbac:permissions:userId and rbac:permissions:userId:orgId
        await cache.del(CACHE_KEYS.rbac.permissions(userId)); // Clear no-orgId key
        await cache.clear(`^rbac:permissions:${userId}:`); // Clear all orgId variations
        await cache.del(CACHE_KEYS.rbac.userRoles(userId)); // Clear no-orgId key
        await cache.clear(`^rbac:userRoles:${userId}:`); // Clear all orgId variations
      }
      await cache.del(CACHE_KEYS.rbac.userWithRoles(userId));
    } else {
      // Invalidate all RBAC caches
      await cache.clear('^rbac:');
    }
  }

  /**
   * Invalidate storage cache
   */
  static async invalidateStorage(): Promise<void> {
    await cache.del(CACHE_KEYS.storage.usage());
    await cache.del(CACHE_KEYS.it.storageMetrics());
  }

  /**
   * Invalidate analytics cache for a department
   */
  static async invalidateAnalytics(department?: string): Promise<void> {
    if (department) {
      await cache.del(CACHE_KEYS.analytics.contracts(department));
      await cache.del(CACHE_KEYS.analytics.stats(department));
      await cache.del(CACHE_KEYS.analytics.performance(department));
      await cache.del(CACHE_KEYS.analytics.compliance(department));
    } else {
      // Clear all analytics caches
      await cache.clear('^analytics:contracts:');
      await cache.clear('^analytics:stats:');
      await cache.clear('^analytics:performance:');
      await cache.clear('^analytics:compliance:');
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
