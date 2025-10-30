import { NextRequest, NextResponse } from 'next/server';

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlacesResponse {
  predictions: GooglePlacePrediction[];
  status: string;
}

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        locations: [],
      });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('Google Places API key not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Location search service not configured',
        },
        { status: 500 }
      );
    }

    // Call Google Places Autocomplete API
    const url = new URL(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json'
    );
    url.searchParams.append('input', query);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('types', 'establishment|geocode'); // Search for establishments and addresses

    const response = await fetch(url.toString());
    const data: GooglePlacesResponse = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status);
      return NextResponse.json(
        {
          success: false,
          error: `Location search failed: ${data.status}`,
        },
        { status: 500 }
      );
    }

    // Transform Google Places predictions to our format
    const locations: LocationSuggestion[] =
      data.predictions?.map((prediction) => ({
        id: prediction.place_id,
        name:
          prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.description,
      })) || [];

    return NextResponse.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error('Error searching locations:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to search locations',
      },
      { status: 500 }
    );
  }
}
