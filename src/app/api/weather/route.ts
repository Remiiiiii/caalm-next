import { NextRequest, NextResponse } from 'next/server';

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

    // Build API URL
    let apiUrl: string;
    if (lat && lon) {
      // Use coordinates for more accurate weather data
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    } else if (city) {
      // Use city name
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

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch weather data',
          message: errorData.message || 'Weather service unavailable',
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
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




