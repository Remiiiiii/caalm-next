import { NextRequest, NextResponse } from 'next/server';
import {
  getCalendarEventsByMonth,
  createCalendarEvent as createEvent,
} from '@/lib/actions/calendar.actions';

export async function GET(request: NextRequest) {
  try {
    console.log('API route called with URL:', request.url);
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    const month = parseInt(searchParams.get('month') || '');

    console.log('Parsed parameters - year:', year, 'month:', month);

    if (!year || !month) {
      console.log('Missing year or month parameters');
      return NextResponse.json(
        { error: 'Year and month parameters are required' },
        { status: 400 }
      );
    }

    console.log('Calling getCalendarEventsByMonth with:', year, month);
    const events = await getCalendarEventsByMonth(year, month);
    console.log('Events fetched:', events);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch calendar events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await createEvent(body);
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
