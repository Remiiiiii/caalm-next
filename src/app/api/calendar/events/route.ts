import { NextRequest, NextResponse } from 'next/server';
import {
  createCalendarEvent,
  getCalendarEventsByMonth,
} from '@/lib/actions/calendar.actions';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let eventData;
    try {
      eventData = await request.json();
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Add the user ID to the event data
    const eventWithUser = {
      ...eventData,
      createdBy: userId,
    };

    console.log('Creating calendar event via API:', eventWithUser);

    const createdEvent = await createCalendarEvent(eventWithUser);

    return NextResponse.json({
      success: true,
      event: createdEvent,
    });
  } catch (error) {
    console.error('Error creating calendar event via API:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create event',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get('year') || new Date().getFullYear().toString()
    );
    const month = parseInt(
      searchParams.get('month') || (new Date().getMonth() + 1).toString()
    );

    console.log('Fetching calendar events for:', { year, month, userId });

    const events = await getCalendarEventsByMonth(year, month);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Error fetching calendar events via API:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to fetch events',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
