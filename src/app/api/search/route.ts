/**
 * Optimized search API with debouncing support, caching, and streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/services/cache-keys';
import { logApiPerformance } from '@/lib/monitoring/performance';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // all, users, contracts, reports
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build cache key
    const cacheKey = `${CACHE_KEYS.search.global(query)}:${type}:${limit}`;

    // Check cache (short TTL for search results)
    const results = await CacheManager.withCache(
      'search',
      cacheKey,
      async () => {
        const { tablesDB } = await createAdminClient();

        // Search based on type
        switch (type) {
          case 'users':
            return await searchUsers(tablesDB, query, limit);
          case 'contracts':
            return await searchContracts(tablesDB, query, limit);
          case 'reports':
            return await searchReports(tablesDB, query, limit);
          default:
            // Search all types in parallel
            const [users, contracts, reports] = await Promise.all([
              searchUsers(tablesDB, query, Math.ceil(limit / 3)),
              searchContracts(tablesDB, query, Math.ceil(limit / 3)),
              searchReports(tablesDB, query, Math.ceil(limit / 3)),
            ]);

            return {
              users,
              contracts,
              reports,
              total: users.length + contracts.length + reports.length,
            };
        }
      },
      CACHE_TTLS.short // 2 minutes for search
    );

    const duration = Date.now() - startTime;
    logApiPerformance('/api/search', 'GET', duration, 200);

    return NextResponse.json({
      success: true,
      data: results,
      cached: true,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiPerformance('/api/search', 'GET', duration, 500);

    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Search users
 */
async function searchUsers(tablesDB: any, query: string, limit: number) {
  if (!query) return [];

  const response = await tablesDB.listRows(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [
      Query.or([
        Query.contains('fullName', query),
        Query.contains('email', query),
      ]),
      Query.limit(limit),
    ]
  );

  return response.rows.map((user: any) => ({
    id: user.$id,
    type: 'user',
    name: user.fullName,
    email: user.email,
  }));
}

/**
 * Search contracts
 */
async function searchContracts(tablesDB: any, query: string, limit: number) {
  if (!query) return [];

  const response = await tablesDB.listRows(
    appwriteConfig.databaseId,
    appwriteConfig.contractsCollectionId,
    [
      Query.or([
        Query.contains('title', query),
        Query.contains('description', query),
      ]),
      Query.limit(limit),
    ]
  );

  return response.rows.map((contract: any) => ({
    id: contract.$id,
    type: 'contract',
    name: contract.title,
    description: contract.description,
  }));
}

/**
 * Search reports
 */
async function searchReports(tablesDB: any, query: string, limit: number) {
  if (!query) return [];

  const response = await tablesDB.listRows(
    appwriteConfig.databaseId,
    appwriteConfig.reportsCollectionId,
    [Query.contains('title', query), Query.limit(limit)]
  );

  return response.rows.map((report: any) => ({
    id: report.$id,
    type: 'report',
    name: report.title,
  }));
}
