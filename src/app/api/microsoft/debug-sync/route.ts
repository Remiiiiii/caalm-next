import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getValidIntegration } from '@/lib/actions/calendar-integration.actions';
import { getCalendarEvents } from '@/lib/actions/calendar.actions';
import { createGraphClient } from '@/lib/microsoft/graph-client';

export async function GET(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    userId: null,
    integration: null,
    caalmEvents: [],
    outlookEvents: [],
    errors: [],
    conflicts: [],
  };

  try {
    // Step 1: Get user ID
    const userId = await getCurrentUserId();
    if (!userId) {
      debugInfo.errors.push('No user ID found');
      return NextResponse.json(debugInfo, { status: 401 });
    }
    debugInfo.userId = userId;

    // Step 2: Check integration
    const integration = await getValidIntegration(userId, 'microsoft');
    if (!integration) {
      debugInfo.errors.push('No Microsoft integration found');
      return NextResponse.json(debugInfo);
    }
    debugInfo.integration = {
      id: integration.$id,
      syncEnabled: integration.sync_enabled,
      lastSync: integration.last_sync,
      tokenExpiry: integration.token_expiry,
    };

    // Step 3: Get CAALM events
    try {
      const caalmEvents = await getCalendarEvents();
      debugInfo.caalmEvents = caalmEvents.map((event) => ({
        id: event.$id,
        title: event.title,
        date: event.date,
        type: event.type,
        outlook_id: event.outlook_id,
        createdBy: event.createdBy,
      }));
    } catch (error) {
      debugInfo.errors.push(
        `CAALM events error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // Step 4: Test Graph API connection
    try {
      const graphClient = createGraphClient(
        integration.access_token,
        integration.refresh_token,
        new Date(integration.token_expiry)
      );

      // Test basic connection
      const userInfo = await graphClient.getUserInfo();
      debugInfo.graphConnection = {
        success: true,
        userName: userInfo.displayName,
        userPrincipalName: userInfo.userPrincipalName,
      };

      // Try to get calendars
      const calendars = await graphClient.getCalendars();
      debugInfo.calendars = calendars.map((cal) => ({
        id: cal.id,
        name: cal.name,
        isDefaultCalendar: cal.isDefaultCalendar,
      }));

      // Try to get events for today
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

      const primaryCalendar =
        calendars.find((cal) => cal.isDefaultCalendar) || calendars[0];
      if (primaryCalendar) {
        const events = await graphClient.getEvents(
          primaryCalendar.id,
          startOfDay,
          endOfDay
        );
        debugInfo.outlookEvents = events.map((event) => ({
          id: event.id,
          subject: event.subject,
          start: event.start?.dateTime,
          end: event.end?.dateTime,
        }));
      }
    } catch (error) {
      debugInfo.errors.push(
        `Graph API error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      debugInfo.graphConnection = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return NextResponse.json(debugInfo);
  } catch (error) {
    debugInfo.errors.push(
      `General error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
    return NextResponse.json(debugInfo, { status: 500 });
  }
}
