import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getValidIntegration } from '@/lib/actions/calendar-integration.actions';
import { getCalendarEvents } from '@/lib/actions/calendar.actions';
import { createGraphClient } from '@/lib/microsoft/graph-client';
import { detectConflict, validateEventForSync } from '@/lib/microsoft/sync';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔍 Starting sync diagnostics for user:', userId);

    // Get integration details
    const integration = await getValidIntegration(userId, 'microsoft');
    if (!integration) {
      return NextResponse.json({
        success: false,
        message: 'No Microsoft integration found',
        diagnostics: {
          integration: false,
          caalmEvents: 0,
          outlookEvents: 0,
          conflicts: [],
          errors: [],
        },
      });
    }

    console.log('✅ Integration found:', integration.$id);

    // Test Graph API connection
    let graphClient;
    try {
      graphClient = createGraphClient(
        integration.access_token,
        integration.refresh_token,
        new Date(integration.token_expiry)
      );
      const userInfo = await graphClient.getUserInfo();
      console.log('✅ Graph API connection successful:', userInfo.displayName);
    } catch (graphError) {
      console.error('❌ Graph API connection failed:', graphError);
      return NextResponse.json({
        success: false,
        message: 'Graph API connection failed',
        diagnostics: {
          integration: true,
          graphConnection: false,
          error:
            graphError instanceof Error ? graphError.message : 'Unknown error',
        },
      });
    }

    // Fetch CAALM events
    let caalmEvents = [];
    let caalmErrors = [];
    try {
      caalmEvents = await getCalendarEvents();
      console.log('✅ CAALM events fetched:', caalmEvents.length);
    } catch (error) {
      console.error('❌ Error fetching CAALM events:', error);
      caalmErrors.push({
        source: 'caalm',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Fetch Outlook events
    let outlookEvents = [];
    let outlookErrors = [];
    try {
      const calendars = await graphClient.getCalendars();
      const primaryCalendar =
        calendars.find((cal) => cal.isDefaultCalendar) || calendars[0];

      if (primaryCalendar) {
        outlookEvents = await graphClient.getEvents(primaryCalendar.id);
        console.log('✅ Outlook events fetched:', outlookEvents.length);
      } else {
        outlookErrors.push({
          source: 'outlook',
          error: 'No primary calendar found',
        });
      }
    } catch (error) {
      console.error('❌ Error fetching Outlook events:', error);
      outlookErrors.push({
        source: 'outlook',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Analyze conflicts
    const conflicts = [];
    const validationErrors = [];

    // Check for conflicts between CAALM and Outlook events
    for (const caalmEvent of caalmEvents) {
      for (const outlookEvent of outlookEvents) {
        try {
          const conflict = detectConflict(caalmEvent, outlookEvent);
          if (conflict) {
            conflicts.push({
              type: conflict.conflictType,
              caalmEvent: {
                id: caalmEvent.$id,
                title: caalmEvent.title,
                date: caalmEvent.date,
              },
              outlookEvent: {
                id: outlookEvent.id,
                subject: outlookEvent.subject,
                start: outlookEvent.start?.dateTime,
              },
            });
          }
        } catch (error) {
          console.error('Error detecting conflict:', error);
        }
      }
    }

    // Validate events
    for (const event of caalmEvents) {
      const validation = validateEventForSync(event);
      if (!validation.valid) {
        validationErrors.push({
          source: 'caalm',
          eventId: event.$id,
          errors: validation.errors,
        });
      }
    }

    for (const event of outlookEvents) {
      const validation = validateEventForSync(event);
      if (!validation.valid) {
        validationErrors.push({
          source: 'outlook',
          eventId: event.id,
          errors: validation.errors,
        });
      }
    }

    const diagnostics = {
      integration: true,
      graphConnection: true,
      caalmEvents: caalmEvents.length,
      outlookEvents: outlookEvents.length,
      conflicts: conflicts,
      validationErrors: validationErrors,
      caalmErrors: caalmErrors,
      outlookErrors: outlookErrors,
      summary: {
        totalEvents: caalmEvents.length + outlookEvents.length,
        conflicts: conflicts.length,
        validationErrors: validationErrors.length,
        apiErrors: caalmErrors.length + outlookErrors.length,
      },
    };

    console.log('🔍 Diagnostics completed:', diagnostics.summary);

    return NextResponse.json({
      success: true,
      message: 'Sync diagnostics completed',
      diagnostics,
    });
  } catch (error) {
    console.error('❌ Sync diagnostics error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to run diagnostics',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
