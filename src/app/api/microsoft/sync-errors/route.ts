import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getValidIntegration } from '@/lib/actions/calendar-integration.actions';
import { getCalendarEvents } from '@/lib/actions/calendar.actions';
import { createGraphClient } from '@/lib/microsoft/graph-client';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔍 Analyzing sync errors for user:', userId);

    // Get integration
    const integration = await getValidIntegration(userId, 'microsoft');
    if (!integration) {
      return NextResponse.json({
        success: false,
        message: 'No Microsoft integration found',
      });
    }

    // Get CAALM events
    const caalmEvents = await getCalendarEvents();
    console.log('📅 CAALM events found:', caalmEvents.length);

    // Test Graph API connection
    let graphClient;
    let graphConnectionError = null;
    try {
      graphClient = createGraphClient(
        integration.access_token,
        integration.refresh_token,
        new Date(integration.token_expiry)
      );
      await graphClient.getUserInfo();
      console.log('✅ Graph API connection successful');
    } catch (error) {
      graphConnectionError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Graph API connection failed:', graphConnectionError);
    }

    // Try to get calendars
    let calendars = [];
    let calendarError = null;
    if (graphClient && !graphConnectionError) {
      try {
        calendars = await graphClient.getCalendars();
        console.log('📅 Calendars found:', calendars.length);
      } catch (error) {
        calendarError =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Failed to get calendars:', calendarError);
      }
    }

    // Try to get events
    let outlookEvents = [];
    let eventsError = null;
    if (graphClient && !graphConnectionError && calendars.length > 0) {
      try {
        const primaryCalendar =
          calendars.find((cal) => cal.isDefaultCalendar) || calendars[0];
        const today = new Date();
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const endOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        );

        outlookEvents = await graphClient.getEvents(
          primaryCalendar.id,
          startOfDay,
          endOfDay
        );
        console.log('📅 Outlook events found:', outlookEvents.length);
      } catch (error) {
        eventsError = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Failed to get events:', eventsError);
      }
    }

    // Analyze potential sync issues
    const analysis = {
      timestamp: new Date().toISOString(),
      userId,
      integration: {
        id: integration.$id,
        syncEnabled: integration.sync_enabled,
        lastSync: integration.last_sync,
        tokenExpiry: integration.token_expiry,
      },
      caalmEvents: {
        count: caalmEvents.length,
        events: caalmEvents.map((event) => ({
          id: event.$id,
          title: event.title,
          date: event.date,
          type: event.type,
          outlook_id: event.outlook_id,
          createdBy: event.createdBy,
        })),
      },
      outlookConnection: {
        success: !graphConnectionError,
        error: graphConnectionError,
      },
      calendars: {
        count: calendars.length,
        error: calendarError,
        calendars: calendars.map((cal) => ({
          id: cal.id,
          name: cal.name,
          isDefaultCalendar: cal.isDefaultCalendar,
        })),
      },
      events: {
        count: outlookEvents.length,
        error: eventsError,
        events: outlookEvents.map((event) => ({
          id: event.id,
          subject: event.subject,
          start: event.start?.dateTime,
          end: event.end?.dateTime,
        })),
      },
      potentialIssues: [],
    };

    // Identify potential issues
    if (graphConnectionError) {
      analysis.potentialIssues.push({
        type: 'authentication',
        severity: 'high',
        message: 'Graph API connection failed',
        error: graphConnectionError,
        solution: 'Reconnect your Microsoft account',
      });
    }

    if (calendarError) {
      analysis.potentialIssues.push({
        type: 'calendar_access',
        severity: 'high',
        message: 'Cannot access calendars',
        error: calendarError,
        solution: 'Check calendar permissions in Azure app registration',
      });
    }

    if (eventsError) {
      analysis.potentialIssues.push({
        type: 'events_access',
        severity: 'medium',
        message: 'Cannot access events',
        error: eventsError,
        solution: 'Check event permissions and calendar access',
      });
    }

    if (caalmEvents.length === 0 && outlookEvents.length === 0) {
      analysis.potentialIssues.push({
        type: 'no_events',
        severity: 'low',
        message: 'No events found in either system',
        solution: 'Create some test events to sync',
      });
    }

    if (caalmEvents.length > 0 && outlookEvents.length === 0) {
      analysis.potentialIssues.push({
        type: 'outlook_no_events',
        severity: 'medium',
        message: 'CAALM has events but Outlook has none',
        solution:
          'Check if events are being created in the correct Outlook calendar',
      });
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error analyzing sync errors:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to analyze sync errors',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
