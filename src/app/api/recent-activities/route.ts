import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivities } from '@/lib/actions/recentActivity.actions';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    console.log('Fetching recent activities with limit:', limit);

    // Cache key for recent activities
    const cacheKey = CACHE_KEYS.recentActivities.list(limit);

    // Fetch recent activities with caching (2 minutes TTL)
    const activities = await CacheManager.withCache(
      'recent-activities',
      cacheKey,
      async () => {
        const data = await getRecentActivities(limit);
        console.log('Recent activities fetched:', data.length);
        return data;
      }
    );

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
}
