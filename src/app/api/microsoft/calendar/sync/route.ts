import { NextRequest, NextResponse } from 'next/server';
import { createGraphClient } from '@/lib/microsoft/graph-client';
import {
  getValidIntegration,
  updateLastSync,
} from '@/lib/actions/calendar-integration.actions';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/actions/calendar.actions';
import {
  graphEventToCaalm,
  caalmEventToGraph,
  detectConflict,
  resolveConflict,
  SyncResult,
  SyncConflict,
  SyncError,
} from '@/lib/microsoft/sync';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { CalendarEvent } from '@/lib/actions/calendar.actions';

export async function POST(request: NextRequest) {
  try {
    // Get current user ID
    let userId: string;

    try {
      userId = await getCurrentUserId();
    } catch (authError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get valid integration
    const integration = await getValidIntegration(userId, 'microsoft');

    if (!integration) {
      return NextResponse.json(
        { error: 'Microsoft calendar integration not found or expired' },
        { status: 404 }
      );
    }

    // Parse request body for sync options
    const {
      startDate,
      endDate,
      strategy = 'newest',
    } = (await request.json()) || {};

    // Create Graph client
    const graphClient = createGraphClient(
      integration.access_token,
      integration.refresh_token,
      new Date(integration.token_expiry)
    );

    // Perform bidirectional sync
    const syncResult = await performBidirectionalSync(
      graphClient,
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      strategy
    );

    // Update last sync timestamp
    await updateLastSync(integration.$id!);

    return NextResponse.json({
      success: true,
      result: syncResult,
      message: `Sync completed: ${syncResult.syncedEvents} events synchronized, ${syncResult.conflicts.length} conflicts, ${syncResult.errors.length} errors`,
    });
  } catch (error) {
    console.error('Error syncing Microsoft calendar:', error);

    return NextResponse.json(
      {
        error: 'Failed to sync calendar',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Perform bidirectional sync between CAALM and Microsoft Graph
 */
async function performBidirectionalSync(
  graphClient: any,
  userId: string,
  startDate?: Date,
  endDate?: Date,
  conflictStrategy: 'caalm' | 'outlook' | 'newest' | 'manual' = 'newest'
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedEvents: 0,
    conflicts: [],
    errors: [],
  };

  try {
    // Set default date range if not provided (last 30 days to next 30 days)
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const syncStart = startDate || defaultStart;
    const syncEnd = endDate || defaultEnd;

    // Fetch events from both sources
    const [caalmEvents, outlookEvents] = await Promise.all([
      getCalendarEvents(), // Get all CAALM events
      graphClient.getEventsInRange(syncStart, syncEnd, 'primary'),
    ]);

    // Create maps for efficient lookup
    const caalmEventMap = new Map<string, CalendarEvent>();
    const outlookEventMap = new Map<string, any>();

    // Populate CAALM event map
    caalmEvents.forEach((event) => {
      const key = generateEventKey(event);
      caalmEventMap.set(key, event);
    });

    // Populate Outlook event map
    outlookEvents.forEach((event: any) => {
      const key = generateEventKey(event);
      outlookEventMap.set(key, event);
    });

    // Find events that exist in both systems
    const commonKeys = new Set(
      [...caalmEventMap.keys()].filter((key) => outlookEventMap.has(key))
    );

    // Find events that only exist in CAALM
    const caalmOnlyKeys = new Set(
      [...caalmEventMap.keys()].filter((key) => !outlookEventMap.has(key))
    );

    // Find events that only exist in Outlook
    const outlookOnlyKeys = new Set(
      [...outlookEventMap.keys()].filter((key) => !caalmEventMap.has(key))
    );

    // Process common events (check for conflicts)
    for (const key of commonKeys) {
      const caalmEvent = caalmEventMap.get(key)!;
      const outlookEvent = outlookEventMap.get(key)!;

      const conflict = detectConflict(caalmEvent, outlookEvent);
      if (conflict) {
        result.conflicts.push(conflict);

        // Resolve conflict based on strategy
        const resolution = resolveConflict(conflict, conflictStrategy);
        if (resolution.resolved && resolution.event) {
          // Update the event in both systems
          try {
            if (resolution.event === caalmEvent) {
              // Update Outlook with CAALM version
              const graphEvent = caalmEventToGraph(caalmEvent);
              await graphClient.updateEvent(outlookEvent.id!, graphEvent);
            } else {
              // Update CAALM with Outlook version
              const caalmEventData = graphEventToCaalm(outlookEvent);
              await updateCalendarEvent(caalmEvent.$id!, caalmEventData);
            }
            result.syncedEvents++;
          } catch (error) {
            result.errors.push({
              eventId: caalmEvent.$id || outlookEvent.id || 'unknown',
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: 'update',
            });
          }
        }
      }
    }

    // Process CAALM-only events (push to Outlook)
    for (const key of caalmOnlyKeys) {
      const caalmEvent = caalmEventMap.get(key)!;

      try {
        const graphEvent = caalmEventToGraph(caalmEvent);
        const createdEvent = await graphClient.createEvent(graphEvent);

        // Store Outlook event ID in CAALM event for future reference
        await updateCalendarEvent(caalmEvent.$id!, {
          ...caalmEvent,
          // Add outlook_id field to track the synced event
          outlook_id: createdEvent.id,
        } as any);

        result.syncedEvents++;
      } catch (error) {
        result.errors.push({
          eventId: caalmEvent.$id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'create',
        });
      }
    }

    // Process Outlook-only events (pull to CAALM)
    for (const key of outlookOnlyKeys) {
      const outlookEvent = outlookEventMap.get(key)!;

      try {
        const caalmEventData = graphEventToCaalm(outlookEvent);
        caalmEventData.createdBy = userId;

        const createdEvent = await createCalendarEvent(caalmEventData);

        // Store Outlook event ID in the created CAALM event
        await updateCalendarEvent(createdEvent.$id!, {
          ...createdEvent,
          outlook_id: outlookEvent.id,
        } as any);

        result.syncedEvents++;
      } catch (error) {
        result.errors.push({
          eventId: outlookEvent.id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'create',
        });
      }
    }

    // Check for any errors that might indicate sync failure
    if (result.errors.length > 0) {
      result.success = false;
    }
  } catch (error) {
    result.success = false;
    result.errors.push({
      eventId: 'sync',
      error: error instanceof Error ? error.message : 'Unknown sync error',
      operation: 'sync',
    });
  }

  return result;
}

/**
 * Generate a unique key for event comparison
 */
function generateEventKey(event: any): string {
  // Use a combination of title, date, and time to create a unique key
  const title = event.title || event.subject || '';
  const date = event.date || event.start?.dateTime || '';
  const time = event.startTime || event.start?.dateTime || '';

  return `${title.toLowerCase().replace(/\s+/g, '_')}_${date}_${time}`;
}
