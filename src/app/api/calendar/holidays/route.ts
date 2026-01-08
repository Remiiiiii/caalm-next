import { NextRequest, NextResponse } from 'next/server';
import { getUSHolidaysForMonth } from '@/lib/utils/holidays';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';

/**
 * GET /api/calendar/holidays
 * Get US holidays for a specific month
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Cache key for holidays
    const cacheKey = CACHE_KEYS.calendar.holidays();

    // Fetch holidays with caching (1 hour TTL - holidays are static)
    const holidays = await CacheManager.withCache(
      'calendar/holidays',
      cacheKey,
      async () => getUSHolidaysForMonth(year, month)
    );

    const response = NextResponse.json({
      success: true,
      holidays,
    });
    
    // Cache holidays for 1 year (they don't change)
    // Use public cache with long max-age for CDN caching
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, stale-while-revalidate=86400'
    );
    
    return response;
  } catch (error) {
    console.error('[SERVER] /api/calendar/holidays] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch holidays',
      },
      { status: 500 }
    );
  }
}

