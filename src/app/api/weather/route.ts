import { NextRequest, NextResponse } from 'next/server';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';

/**
 * Server-side API route for weather data
 * Protects the OpenWeatherMap API key and handles requests securely
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const city = searchParams.get('city');

    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      console.error('[SERVER] Weather API] OPENWEATHER_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Weather API key not configured',
          message:
            'OPENWEATHER_API_KEY environment variable is not set. Please configure it in your environment variables.',
        },
        { status: 500 }
      );
    }

    // Build cache key based on location type
    let cacheKey: string;
    let apiUrl: string;
    
    if (lat && lon) {
      // Use coordinates for more accurate weather data
      cacheKey = CACHE_KEYS.weather.byCoords(lat, lon);
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    } else if (city) {
      // Use city name
      cacheKey = CACHE_KEYS.weather.byCity(city);
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${apiKey}&units=imperial`;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing location parameters',
          message: 'Either lat/lon or city parameter is required',
        },
        { status: 400 }
      );
    }

    // Fetch weather data with caching (10 minutes TTL)
    const result = await CacheManager.withCache(
      'weather',
      cacheKey,
      async () => {
        const response = await fetch(apiUrl, {
          next: { revalidate: 600 }, // Cache for 10 minutes
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[SERVER] Weather API] OpenWeatherMap API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });

          throw new Error(errorData.message || 'Weather service unavailable');
        }

        const data = await response.json();
        return {
          success: true,
          data,
        };
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[SERVER] Weather API] Error fetching weather:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}




