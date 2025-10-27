import { NextRequest, NextResponse } from 'next/server';
import {
  createCalendarEvent,
  getCalendarEventsByMonth,
  deleteCalendarEvent,
} from '@/lib/actions/calendar.actions';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { logAuditEvent } from '@/lib/services/audit-logger';
import { syncDeletionToOutlook } from '@/lib/services/deletion-sync';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

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
    const userId = await getCurrentUserId();

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

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const reason = searchParams.get('reason') || undefined;

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    console.log('Deleting calendar event via API:', {
      eventId,
      userId,
      reason,
    });

    // Get event details before deletion for audit logging
    let eventTitle = 'Unknown Event';
    try {
      // We'll get the event title from the soft delete operation
      // For now, we'll use a placeholder and update it after
    } catch (error) {
      console.warn('Could not fetch event details for audit:', error);
    }

    // Perform soft delete immediately
    await deleteCalendarEvent(eventId, userId);

    // Get client IP and user agent for audit
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log the deletion audit event
    await logAuditEvent({
      event_id: eventId,
      event_title: eventTitle,
      action: 'delete',
      source: 'caalm',
      user_id: userId,
      user_name: 'User', // We'll need to fetch this from user data
      user_email: 'user@example.com', // We'll need to fetch this from user data
      ip_address: ipAddress,
      user_agent: userAgent,
      reason: reason,
      status: 'success',
      metadata: {
        deleted_at: new Date().toISOString(),
        deletion_method: 'soft_delete',
      },
    });

    // Trigger background Outlook deletion (non-blocking)
    syncDeletionToOutlook(eventId, 3).catch((error) => {
      console.error('Background deletion sync failed:', error);
      // The sync service will handle logging the failure
    });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting calendar event via API:', error);

    // Log the failed deletion attempt
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (eventId) {
      try {
        await logAuditEvent({
          event_id: eventId,
          event_title: 'Unknown Event',
          action: 'delete',
          source: 'caalm',
          user_id: 'unknown',
          user_name: 'Unknown User',
          user_email: 'unknown@example.com',
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          metadata: { error_type: 'api_error' },
        });
      } catch (auditError) {
        console.error(
          'Failed to log audit event for failed deletion:',
          auditError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to delete event',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
