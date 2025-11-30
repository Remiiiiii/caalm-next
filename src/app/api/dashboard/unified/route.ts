import { NextRequest } from 'next/server';
import { createApiAdminClient } from '@/lib/appwrite/api-client';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getUninvitedUsers } from '@/lib/actions/user.actions';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/services/cache-keys';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || 'default_organization';
    const userId = searchParams.get('userId');
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Check ETag for conditional requests (304 Not Modified)
    const ifNoneMatch = request.headers.get('if-none-match');
    const isWarmUp = request.headers.get('X-Warm-Up') === 'true';

    if (process.env.NODE_ENV === 'development' && !isWarmUp) {
      console.log('Unified dashboard API called with:', { orgId, userId, page, limit });
    }

    if (!userId) {
      console.error('Unified dashboard API: Missing userId parameter');
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Check cache first (include pagination in cache key)
    const cacheKey = `${CACHE_KEYS.dashboard.unified(orgId, userId)}:page:${page}:limit:${limit}`;
    
    // Try to get cached data first to check ETag
    const existingCache = await import('@/lib/services/redis-cache').then(m => m.get(cacheKey));
    if (existingCache && ifNoneMatch && existingCache.timestamp) {
      const etag = `"${existingCache.timestamp}"`;
      if (ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: {
            'ETag': etag,
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        });
      }
    }
    
    // For warm-up requests with existing cache, return immediately
    if (isWarmUp && existingCache) {
      return new Response(JSON.stringify({ warmed: true, cached: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    
    const cachedData = await CacheManager.withCache(
      'dashboard/unified',
      cacheKey,
      async () => {
        const { tablesDB } = await createApiAdminClient();

        // Fetch all data simultaneously using Promise.allSettled for error handling
        const [
          contractsResult,
          usersResult,
          invitationsResult,
          filesResult,
          reportsResult,
          departmentsResult,
          reportTemplatesResult,
          notificationsResult,
          notificationsStatsResult,
          recentActivitiesResult,
          calendarEventsResult,
          uninvitedUsersResult,
        ] = await Promise.allSettled([
          // Contracts data - Paginated for performance
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId: appwriteConfig.contractsCollectionId || 'contracts',
            queries: [
              Query.orderDesc('$createdAt'),
              Query.limit(limit),
              Query.offset(offset),
            ],
          }),

          // Users data - Paginated for performance
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId: appwriteConfig.usersCollectionId || 'users',
            queries: [
              Query.orderDesc('$createdAt'),
              Query.limit(limit),
              Query.offset(offset),
            ],
          }),

          // Invitations data - reduced limit for faster initial load
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId: appwriteConfig.invitationsCollectionId || 'invitations',
            queries: [Query.equal('orgId', orgId), Query.limit(50)],
          }),

          // Files data - reduced limit
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId: appwriteConfig.filesCollectionId || 'files',
            queries: [Query.orderDesc('$createdAt'), Query.limit(5)],
          }),

          // Reports data - reduced limit
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId: appwriteConfig.reportsCollectionId || 'reports',
            queries: [
              Query.equal('userId', userId),
              Query.orderDesc('$createdAt'),
              Query.limit(10),
            ],
          }),

          // Departments data (static)
          Promise.resolve({ documents: [] }), // Placeholder for departments

          // Report templates data (static)
          Promise.resolve({ documents: [] }), // Placeholder for report templates

          // Notifications data - reduced limit
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.notificationsCollectionId || 'notifications',
            queries: [
              Query.equal('userId', userId),
              Query.orderDesc('$createdAt'),
              Query.limit(20),
            ],
          }),

          // Notifications stats - use count query instead of full list
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.notificationsCollectionId || 'notifications',
            queries: [
              Query.equal('userId', userId),
              Query.limit(1), // Just need count, not full data
            ],
          }),

          // Recent activities - reduced limit
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.recentActivityCollectionId || 'recent-activity',
            queries: [Query.orderDesc('$createdAt'), Query.limit(10)],
          }),

          // Calendar events - reduced limit
          tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.calendarEventsCollectionId || 'calendar-events',
            queries: [Query.orderDesc('$createdAt'), Query.limit(20)],
          }),

          // Uninvited users from Auth database
          getUninvitedUsers(),
        ]);

        // Helper function to safely get results
        const getResult = (result: any) => {
          if (result.status === 'fulfilled') {
            return {
              ...result.value,
              documents: result.value.rows || result.value.documents || [],
            };
          }
          console.error('Database query failed:', result.reason);
          return { documents: [], total: 0 };
        };

        // Extract results safely
        const contracts = getResult(contractsResult);
        const users = getResult(usersResult);
        const invitations = getResult(invitationsResult);
        const files = getResult(filesResult);
        const reports = getResult(reportsResult);
        const notifications = getResult(notificationsResult);
        const notificationsStats = getResult(notificationsStatsResult);
        const recentActivities = getResult(recentActivitiesResult);
        const calendarEvents = getResult(calendarEventsResult);

        // Calculate dashboard stats
        const totalContracts = contracts.total;
        const expiringContracts = contracts.documents.filter(
          (contract: any) => {
            const expiryDate = new Date(contract.expiryDate);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
          }
        ).length;

        const activeUsers = users.documents.filter(
          (user: any) => user.status === 'active'
        ).length;

        const compliantContracts = contracts.documents.filter(
          (contract: any) =>
            contract.compliance === 'up-to-date' ||
            contract.compliance === 'compliant'
        ).length;
        const complianceRate =
          totalContracts > 0
            ? Math.round((compliantContracts / totalContracts) * 100)
            : 0;

        // Calculate notifications stats
        const unreadNotifications = notificationsStats.documents.filter(
          (notification: any) => !notification.read
        ).length;
        const totalNotifications = notificationsStats.total;

        // Get uninvited users result
        const uninvitedUsers =
          uninvitedUsersResult.status === 'fulfilled'
            ? uninvitedUsersResult.value
            : [];

        const unifiedData = {
          stats: {
            totalContracts,
            expiringContracts,
            activeUsers,
            complianceRate: `${complianceRate}%`,
          },
          files: files.documents,
          invitations: invitations.documents,
          authUsers: users.documents,
          uninvitedUsers: uninvitedUsers,
          reports: reports.documents,
          departments: getResult(departmentsResult).documents,
          reportTemplates: getResult(reportTemplatesResult).documents,
          notifications: notifications.documents,
          notificationsStats: {
            unread: unreadNotifications,
            total: totalNotifications,
          },
          recentActivities: recentActivities.documents,
          calendarEvents: calendarEvents.documents,
          // Pagination metadata
          pagination: {
            contracts: {
              page,
              limit,
              total: contracts.total,
              hasMore: offset + limit < contracts.total,
            },
            users: {
              page,
              limit,
              total: users.total,
              hasMore: offset + limit < users.total,
            },
          },
        };

        return {
          data: unifiedData,
          timestamp: Date.now(),
        };
      },
      CACHE_TTLS.veryLong
    );

    // For warm-up requests, return immediately after triggering cache
    if (isWarmUp) {
      return new Response(JSON.stringify({ warmed: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    // Determine if this is a cache hit or miss
    const isCacheHit = cachedData.timestamp && (Date.now() - cachedData.timestamp) < 1000;
    
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'X-Cache': isCacheHit ? 'HIT' : 'MISS',
        // Cache response for 5 minutes in browser/CDN
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        // ETag for conditional requests
        'ETag': `"${cachedData.timestamp}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching unified dashboard data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: (error as Error)?.message || 'Failed to load dashboard data',
        timestamp: new Date().toISOString(),
        debug:
          process.env.NODE_ENV === 'development'
            ? {
                stack: error instanceof Error ? error.stack : undefined,
              }
            : undefined,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
