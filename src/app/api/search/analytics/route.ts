import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'appwrite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, query, filters, resultCount, searchTime } = body;

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'User ID and query are required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Log search analytics
    const searchLog = await databases.createDocument(
      appwriteConfig.databaseId,
      'search_analytics',
      ID.unique(),
      {
        userId,
        query: query.trim(),
        filters: filters || {},
        resultCount: resultCount || 0,
        searchTime: searchTime || 0,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || '',
        ipAddress:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown',
      }
    );

    return NextResponse.json({ success: true, logId: searchLog.$id });
  } catch (error) {
    console.error('Search analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to log search analytics' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get search analytics for the user
    const analytics = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'search_analytics',
      queries: [
        Query.equal('userId', userId),
        Query.greaterThanEqual('timestamp', startDate.toISOString()),
        Query.lessThanEqual('timestamp', endDate.toISOString()),
        Query.orderDesc('timestamp'),
        Query.limit(limit),
      ],
    });

    // Calculate popular searches
    const searchCounts = new Map<string, number>();
    const filterUsage = new Map<string, number>();
    let totalSearches = 0;
    let totalSearchTime = 0;

    analytics.rows.forEach((log) => {
      totalSearches++;
      totalSearchTime += log.searchTime || 0;

      // Count search queries
      const query = log.query.toLowerCase().trim();
      searchCounts.set(query, (searchCounts.get(query) || 0) + 1);

      // Count filter usage
      const filters = log.filters || {};
      Object.keys(filters).forEach((filter) => {
        if (filters[filter]) {
          filterUsage.set(filter, (filterUsage.get(filter) || 0) + 1);
        }
      });
    });

    // Get top searches
    const topSearches = Array.from(searchCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Get most used filters
    const topFilters = Array.from(filterUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([filter, count]) => ({ filter, count }));

    return NextResponse.json({
      analytics: {
        totalSearches,
        averageSearchTime:
          totalSearches > 0 ? totalSearchTime / totalSearches : 0,
        topSearches,
        topFilters,
        recentSearches: analytics.rows.slice(0, 20).map((log) => ({
          query: log.query,
          filters: log.filters,
          resultCount: log.resultCount,
          searchTime: log.searchTime,
          timestamp: log.timestamp,
        })),
      },
    });
  } catch (error) {
    console.error('Get search analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to get search analytics' },
      { status: 500 }
    );
  }
}
