import { NextRequest, NextResponse } from 'next/server';
import {
  getCalendarEventsByMonth,
  createCalendarEvent,
} from '@/lib/actions/calendar.actions';
import { appwriteConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get('year') || new Date().getFullYear().toString()
    );
    const month = parseInt(
      searchParams.get('month') || (new Date().getMonth() + 1).toString()
    );

    console.log('Fetching calendar events for:', year, month);

    const events = await getCalendarEventsByMonth(year, month);
    console.log('Calendar events fetched:', events);

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json();
    console.log('Creating calendar event with data:', eventData);

    // Log the configuration
    console.log('Database ID:', appwriteConfig.databaseId);
    console.log(
      'Calendar Events Collection ID:',
      appwriteConfig.calendarEventsCollectionId
    );

    // Test if the collection exists
    try {
      const adminClient = await createAdminClient();
      const collections = await adminClient.databases.listCollections(
        appwriteConfig.databaseId
      );
      console.log(
        'Available collections:',
        collections.collections.map((c) => ({ id: c.$id, name: c.name }))
      );

      const targetCollection = collections.collections.find(
        (c) => c.$id === appwriteConfig.calendarEventsCollectionId
      );
      if (!targetCollection) {
        console.error('Calendar events collection not found!');
        return NextResponse.json(
          {
            error: 'Calendar events collection not found',
            details: `Collection ID "${appwriteConfig.calendarEventsCollectionId}" not found in database`,
            availableCollections: collections.collections.map((c) => ({
              id: c.$id,
              name: c.name,
            })),
          },
          { status: 404 }
        );
      }
      console.log('Found calendar events collection:', targetCollection);
    } catch (collectionError) {
      console.error('Error checking collections:', collectionError);
    }

    const createdEvent = await createCalendarEvent(eventData);
    console.log('Calendar event created:', createdEvent);

    return NextResponse.json(createdEvent);
  } catch (error) {
    console.error('Error creating calendar event:', error);

    // Return more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create calendar event',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
