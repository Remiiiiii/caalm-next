/**
 * Centralized cache key management for the application
 * Prevents cache key collisions and ensures consistency
 */

export const CACHE_KEYS = {
  // Dashboard
  dashboard: {
    unified: (orgId: string, userId: string) =>
      `dashboard:unified:${orgId}:${userId}`,
    stats: (orgId: string) => `dashboard:stats:${orgId}`,
  },

  // Analytics
  analytics: {
    unified: (userId: string) => `analytics:unified:${userId}`,
    admin: () => `analytics:admin`,
    department: (deptId: string) => `analytics:dept:${deptId}`,
  },

  // Calendar
  calendar: {
    events: (year: number, month: number) => `calendar:events:${year}:${month}`,
    event: (eventId: string) => `calendar:event:${eventId}`,
  },

  // Notifications
  notifications: {
    user: (userId: string) => `notifications:user:${userId}`,
    stats: (userId: string) => `notifications:stats:${userId}`,
    unreadCount: (userId: string) => `notifications:unread:${userId}`,
  },

  // Contracts
  contracts: {
    all: () => `contracts:all`,
    user: (userId: string) => `contracts:user:${userId}`,
    expirations: () => `contracts:expirations`,
  },

  // Reports
  reports: {
    user: (userId: string) => `reports:user:${userId}`,
    templates: () => `reports:templates`,
    report: (reportId: string) => `reports:report:${reportId}`,
  },

  // Users
  users: {
    all: () => `users:all`,
    uninvited: () => `users:uninvited`,
    search: (query: string) => `users:search:${query}`,
  },

  // Recent Activities
  recentActivities: () => `recent-activities`,

  // Audit Logs
  audits: {
    logs: (filters: string) => `audits:logs:${filters}`,
    stats: () => `audits:stats`,
  },

  // Search
  search: {
    global: (query: string) => `search:global:${query}`,
    suggestions: (query: string) => `search:suggestions:${query}`,
  },
} as const;

/**
 * Cache TTLs in seconds
 */
export const CACHE_TTLS = {
  short: 120, // 2 minutes - for frequently changing data
  medium: 300, // 5 minutes - for moderately changing data
  long: 600, // 10 minutes - for slowly changing data
  veryLong: 900, // 15 minutes - for rarely changing data
  static: 3600, // 1 hour - for static/rarely changing data
} as const;

/**
 * Get TTL for a specific cache key type
 */
export const getTTLForRoute = (route: string): number => {
  const ttlMap: Record<string, number> = {
    'dashboard/unified': CACHE_TTLS.veryLong,
    'dashboard/stats': CACHE_TTLS.long,
    'analytics/unified': CACHE_TTLS.veryLong,
    'analytics/admin': CACHE_TTLS.veryLong,
    'calendar/events': CACHE_TTLS.medium,
    notifications: CACHE_TTLS.short,
    'notifications/stats': CACHE_TTLS.medium,
    contracts: CACHE_TTLS.long,
    'contracts/check-expirations': CACHE_TTLS.static,
    reports: CACHE_TTLS.static,
    users: CACHE_TTLS.veryLong,
    'users/uninvited': CACHE_TTLS.static,
    'recent-activities': CACHE_TTLS.short,
    'audits/logs': CACHE_TTLS.medium,
    'audits/stats': CACHE_TTLS.long,
  };

  return ttlMap[route] || CACHE_TTLS.medium;
};
