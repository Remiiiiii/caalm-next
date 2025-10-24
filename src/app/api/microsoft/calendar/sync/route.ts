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

// Enhanced sync lock with timestamp to prevent stale locks
let syncLock: { isLocked: boolean; timestamp: number; userId?: string } = {
  isLocked: false,
  timestamp: 0,
};

const SYNC_LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes timeout (increased)
const SYNC_COOLDOWN = 2 * 60 * 1000; // 2 minutes cooldown between syncs (increased)

export async function POST(request: NextRequest) {
  const now = Date.now();

  // Check global sync lock first
  try {
    const globalLockResponse = await fetch(
      'http://localhost:3000/api/microsoft/global-sync-lock'
    );
    const globalLockData = await globalLockResponse.json();

    if (globalLockData.locked) {
      console.log(
        '🚨 Global sync lock is active - blocking all sync operations'
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Sync is globally locked. All sync operations are blocked.',
          globalLock: true,
        },
        { status: 423 } // 423 Locked
      );
    }
  } catch (error) {
    console.warn('Could not check global sync lock:', error);
    // Continue with sync if we can't check the global lock
  }

  // Check if sync is locked and if the lock is still valid
  if (syncLock.isLocked && now - syncLock.timestamp < SYNC_LOCK_TIMEOUT) {
    console.log('Sync already in progress, skipping...');
    return NextResponse.json(
      {
        success: false,
        message: 'Sync already in progress. Please wait.',
        lockedUntil: new Date(
          syncLock.timestamp + SYNC_LOCK_TIMEOUT
        ).toISOString(),
      },
      { status: 429 }
    );
  }

  // Check cooldown period
  if (syncLock.timestamp > 0 && now - syncLock.timestamp < SYNC_COOLDOWN) {
    console.log('Sync cooldown active, skipping...');
    return NextResponse.json(
      {
        success: false,
        message: 'Please wait before syncing again.',
        cooldownRemaining: Math.ceil(
          (SYNC_COOLDOWN - (now - syncLock.timestamp)) / 1000
        ),
      },
      { status: 429 }
    );
  }

  // Set sync lock
  syncLock = {
    isLocked: true,
    timestamp: now,
  };

  try {
    console.log('Starting Microsoft calendar sync...');

    // Get user ID from request body or header
    const body = await request.json();
    const userId = body.userId || request.headers.get('X-User-ID');

    console.log('Sync request for user:', userId);

    if (!userId) {
      console.error('No user ID provided in sync request');
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get valid integration
    console.log('Getting Microsoft integration for user:', userId);
    const integration = await getValidIntegration(userId, 'microsoft');

    if (!integration) {
      console.error('No Microsoft integration found for user:', userId);
      return NextResponse.json(
        { error: 'Microsoft calendar integration not found or expired' },
        { status: 404 }
      );
    }

    // CRITICAL: Check if sync is enabled
    if (!integration.sync_enabled) {
      console.log('Sync is disabled for user:', userId);
      return NextResponse.json(
        {
          success: false,
          message:
            'Sync is currently disabled. Enable it in calendar settings to resume synchronization.',
          sync_enabled: false,
        },
        { status: 200 }
      );
    }

    console.log('Integration found:', {
      id: integration.$id,
      connected_at: integration.connected_at,
      last_sync: integration.last_sync,
      sync_enabled: integration.sync_enabled,
      token_expiry: integration.token_expiry,
    });

    // CRITICAL: Check token expiry before proceeding
    const tokenExpiry = new Date(integration.token_expiry);
    const now = new Date();
    const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();

    if (timeUntilExpiry < 0) {
      console.log('❌ Token has already expired');
      return NextResponse.json(
        {
          success: false,
          message:
            'Authentication token has expired. Please reconnect your Microsoft account.',
          error: 'token_expired',
          requiresReauth: true,
        },
        { status: 401 }
      );
    }

    if (timeUntilExpiry < 5 * 60 * 1000) {
      // Less than 5 minutes until expiry
      console.log('⚠️ Token expires soon, attempting refresh before sync');
      try {
        // Force token refresh before sync
        const graphClient = createGraphClient(
          integration.access_token,
          integration.refresh_token,
          tokenExpiry
        );
        // Test the connection to trigger refresh if needed
        await graphClient.getUserInfo();
        console.log('✅ Token refreshed successfully');
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        return NextResponse.json(
          {
            success: false,
            message:
              'Authentication token expired. Please reconnect your Microsoft account.',
            error: 'token_expired',
            requiresReauth: true,
          },
          { status: 401 }
        );
      }
    }

    // Parse request body for sync options (already read above)
    const { startDate, endDate, strategy = 'newest' } = body || {};

    console.log('Sync options:', { startDate, endDate, strategy });

    // Create Graph client
    console.log('Creating Graph client...');
    const graphClient = createGraphClient(
      integration.access_token,
      integration.refresh_token,
      new Date(integration.token_expiry)
    );

    // Test Graph API connection before proceeding
    console.log('Testing Graph API connection...');
    try {
      await graphClient.getUserInfo();
      console.log('✅ Graph API connection successful');
    } catch (connectionError) {
      console.error('❌ Graph API connection failed:', connectionError);
      return NextResponse.json(
        {
          success: false,
          message:
            'Cannot connect to Microsoft Graph API. Please check your connection and try again.',
          error: 'graph_connection_failed',
          details:
            connectionError instanceof Error
              ? connectionError.message
              : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Perform bidirectional sync
    console.log('Starting bidirectional sync...');

    // Add timeout mechanism to prevent hanging
    const syncTimeout = 30000; // 30 seconds timeout
    const syncPromise = performBidirectionalSync(
      graphClient,
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      strategy
    );

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sync operation timed out after 30 seconds'));
      }, syncTimeout);
    });

    const syncResult = (await Promise.race([
      syncPromise,
      timeoutPromise,
    ])) as any;

    console.log('Sync completed:', syncResult);

    // Update last sync timestamp
    await updateLastSync(integration.$id!);

    // Enhanced result with detailed conflict and error information
    const detailedResult = {
      success: syncResult.success,
      syncedEvents: syncResult.syncedEvents,
      conflicts: syncResult.conflicts.map((conflict) => ({
        type: conflict.conflictType,
        caalmEvent: conflict.caalmEvent?.title || 'Unknown',
        outlookEvent: conflict.outlookEvent?.subject || 'Unknown',
        field: conflict.field,
        caalmValue: conflict.caalmValue,
        outlookValue: conflict.outlookValue,
      })),
      errors: syncResult.errors.map((error) => ({
        eventId: error.eventId,
        operation: error.operation,
        error: error.error,
        eventTitle: error.eventTitle || 'Unknown',
        eventDate: error.eventDate || 'Unknown',
      })),
    };

    console.log('📊 Sync completed with details:', {
      syncedEvents: syncResult.syncedEvents,
      conflictsCount: syncResult.conflicts.length,
      errorsCount: syncResult.errors.length,
      conflicts: detailedResult.conflicts,
      errors: detailedResult.errors,
    });

    // Log each error in detail for debugging
    if (syncResult.errors.length > 0) {
      console.log('🚨 SYNC ERRORS DETECTED:');
      syncResult.errors.forEach((error, index) => {
        console.log(`   Error ${index + 1}:`, {
          eventId: error.eventId,
          operation: error.operation,
          error: error.error,
          eventTitle: error.eventTitle,
          eventDate: error.eventDate,
          stack: error.stack,
        });
      });
    }

    return NextResponse.json({
      success: true,
      result: detailedResult,
      message: `Sync completed: ${syncResult.syncedEvents} events synchronized, ${syncResult.conflicts.length} conflicts, ${syncResult.errors.length} errors`,
    });
  } catch (error) {
    console.error('Error syncing Microsoft calendar:', error);

    return NextResponse.json(
      {
        error: 'Failed to sync calendar',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    // Always release the sync lock
    syncLock = {
      isLocked: false,
      timestamp: 0,
    };
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
    console.log('Fetching events from CAALM and Outlook...');
    console.log(
      'Sync date range:',
      syncStart.toISOString(),
      'to',
      syncEnd.toISOString()
    );

    let caalmEvents: CalendarEvent[] = [];
    let outlookEvents: any[] = [];
    let primaryCalendar: any = null;

    try {
      console.log('Fetching CAALM events...');
      caalmEvents = await getCalendarEvents();
      console.log('CAALM events found:', caalmEvents.length);
    } catch (caalmError) {
      console.error('Error fetching CAALM events:', caalmError);
      result.errors.push({
        eventId: 'caalm-fetch',
        error:
          caalmError instanceof Error
            ? caalmError.message
            : 'Unknown CAALM error',
        operation: 'sync',
      });
    }

    try {
      console.log('Fetching Outlook events...');
      console.log(
        'Sync date range for Outlook:',
        syncStart.toISOString(),
        'to',
        syncEnd.toISOString()
      );

      // First, let's test basic connectivity
      console.log('Testing basic Graph API connectivity...');
      const userInfo = await graphClient.getUserInfo();
      console.log(
        '✅ Graph API connectivity test passed. User:',
        userInfo.displayName
      );

      // Get calendars first
      console.log('Fetching Outlook calendars...');
      const calendars = await graphClient.getCalendars();
      console.log('Outlook calendars found:', calendars.length);

      if (calendars.length === 0) {
        console.warn('No Outlook calendars found!');
        return {
          success: true,
          syncedEvents: 0,
          conflicts: [],
          errors: [],
        };
      }

      // Use the primary calendar
      primaryCalendar =
        calendars.find((cal) => cal.isDefaultCalendar) || calendars[0];
      console.log('Using calendar:', primaryCalendar.name, primaryCalendar.id);

      outlookEvents = await graphClient.getEventsInRange(
        syncStart,
        syncEnd,
        primaryCalendar.id
      );
      console.log('Outlook events found:', outlookEvents.length);

      if (outlookEvents.length > 0) {
        console.log('Sample Outlook event:', {
          subject: outlookEvents[0].subject,
          start: outlookEvents[0].start,
          end: outlookEvents[0].end,
        });
      } else {
        console.log('No Outlook events found in the specified date range');
      }
    } catch (outlookError) {
      console.error('Error fetching Outlook events:', outlookError);
      result.errors.push({
        eventId: 'outlook-fetch',
        error:
          outlookError instanceof Error
            ? outlookError.message
            : 'Unknown Outlook error',
        operation: 'sync',
      });
    }

    // Check if we have a valid calendar
    if (!primaryCalendar) {
      console.error('No valid Outlook calendar found');
      result.errors.push({
        eventId: 'calendar-fetch',
        error: 'No valid Outlook calendar found',
        operation: 'sync',
      });
      return result;
    }

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
        console.log('🔍 Conflict detected:', {
          caalmEvent: caalmEvent.title,
          outlookEvent: outlookEvent.subject,
          conflictType: conflict.conflictType,
          strategy: conflictStrategy,
        });
        result.conflicts.push(conflict);

        // Resolve conflict based on strategy
        const resolution = resolveConflict(conflict, conflictStrategy);
        if (resolution.resolved && resolution.event) {
          // Update the event in both systems
          try {
            if (resolution.event === caalmEvent) {
              // Update Outlook with CAALM version
              const graphEvent = caalmEventToGraph(caalmEvent);

              // Validate Outlook event ID format
              if (!outlookEvent.id || outlookEvent.id.length < 10) {
                console.warn(
                  'Invalid Outlook event ID, skipping update:',
                  outlookEvent.id
                );
                continue;
              }

              console.log('Updating Outlook event with CAALM data:', {
                outlookEventId: outlookEvent.id,
                caalmEventId: caalmEvent.$id,
                graphEvent: {
                  subject: graphEvent.subject,
                  start: graphEvent.start,
                  end: graphEvent.end,
                },
              });
              await graphClient.updateEvent(
                outlookEvent.id,
                graphEvent,
                primaryCalendar.id
              );
            } else {
              // Update CAALM with Outlook version
              const caalmEventData = graphEventToCaalm(outlookEvent);
              console.log('Updating CAALM event with Outlook data:', {
                caalmEventId: caalmEvent.$id,
                outlookEventId: outlookEvent.id,
                caalmEventData: {
                  title: caalmEventData.title,
                  date: caalmEventData.date,
                  startTime: caalmEventData.startTime,
                },
              });
              await updateCalendarEvent(caalmEvent.$id!, caalmEventData);
            }
            result.syncedEvents++;
          } catch (error) {
            console.error(
              'Error updating event during conflict resolution:',
              error
            );
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
    console.log('Processing CAALM-only events:', caalmOnlyKeys.length);
    for (const key of caalmOnlyKeys) {
      const caalmEvent = caalmEventMap.get(key)!;

      try {
        // CRITICAL: Check if this event already has an outlook_id (already synced)
        if (caalmEvent.outlook_id) {
          console.log(
            'Skipping already synced CAALM event:',
            caalmEvent.title,
            'outlook_id:',
            caalmEvent.outlook_id
          );
          continue;
        }

        // Validate the event before converting
        if (!caalmEvent.date || !caalmEvent.title) {
          console.warn('Skipping invalid CAALM event:', caalmEvent);
          continue;
        }

        // Additional check: Skip events created by sync to prevent loops
        if (caalmEvent.createdBy === 'outlook-sync') {
          console.log(
            'Skipping CAALM event created by Outlook sync:',
            caalmEvent.title
          );
          continue;
        }

        console.log('Converting CAALM event to Graph format:', {
          title: caalmEvent.title,
          date: caalmEvent.date,
          type: caalmEvent.type,
        });

        const graphEvent = caalmEventToGraph(caalmEvent);

        console.log('Converted Graph event:', {
          subject: graphEvent.subject,
          start: graphEvent.start,
          end: graphEvent.end,
        });

        // Validate the converted event
        if (
          !graphEvent.subject ||
          !graphEvent.start?.dateTime ||
          !graphEvent.end?.dateTime
        ) {
          console.warn('Skipping invalid Graph event:', graphEvent);
          continue;
        }

        console.log('Creating event in Microsoft Graph...');
        const createdEvent = await graphClient.createEvent(
          graphEvent,
          primaryCalendar.id
        );

        // Store Outlook event ID in CAALM event for future reference
        await updateCalendarEvent(caalmEvent.$id!, {
          ...caalmEvent,
          // Add outlook_id field to track the synced event
          outlook_id: createdEvent.id,
        } as any);

        result.syncedEvents++;
        console.log('Successfully created Outlook event:', createdEvent.id);
      } catch (error) {
        console.error(
          'Failed to create Outlook event for CAALM event:',
          caalmEvent.$id,
          error
        );

        // Check if it's a validation error from our conversion
        if (error instanceof Error && error.message.includes('Event')) {
          console.warn(
            'Skipping event due to validation error:',
            error.message
          );
          continue; // Skip this event instead of adding to errors
        }

        // Enhanced error logging for debugging
        const errorDetails = {
          eventId: caalmEvent.$id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'create',
          eventData: {
            title: caalmEvent.title,
            date: caalmEvent.date,
            type: caalmEvent.type,
            endTime: caalmEvent.endTime,
          },
          stack: error instanceof Error ? error.stack : undefined,
        };

        console.error('❌ Detailed sync error:', errorDetails);
        result.errors.push(errorDetails);
      }
    }

    // Process Outlook-only events (pull to CAALM)
    console.log('Processing Outlook-only events:', outlookOnlyKeys.size);
    for (const key of outlookOnlyKeys) {
      const outlookEvent = outlookEventMap.get(key)!;

      try {
        console.log(
          'Converting Outlook event to CAALM format:',
          outlookEvent.subject
        );

        // CRITICAL: Check if this Outlook event already exists in CAALM (prevent duplicates)
        const existingCaalmEvents = await getCalendarEvents();
        const duplicateCheck = existingCaalmEvents.find((existingEvent) => {
          // Check by outlook_id first (most reliable)
          if (existingEvent.outlook_id === outlookEvent.id) {
            return true;
          }
          // Fallback to key comparison
          const existingKey = generateEventKey(existingEvent);
          return existingKey === key;
        });

        if (duplicateCheck) {
          console.log(
            'Skipping duplicate Outlook event:',
            outlookEvent.subject,
            'already exists in CAALM with outlook_id:',
            duplicateCheck.outlook_id
          );
          continue;
        }

        const caalmEventData = graphEventToCaalm(outlookEvent);
        caalmEventData.createdBy = userId;

        console.log('Creating CAALM event:', caalmEventData.title);
        const createdEvent = await createCalendarEvent(caalmEventData);

        // Store Outlook event ID in the created CAALM event
        await updateCalendarEvent(createdEvent.$id!, {
          ...createdEvent,
          outlook_id: outlookEvent.id,
        } as any);

        console.log(
          'Successfully created CAALM event from Outlook:',
          createdEvent.$id
        );
        result.syncedEvents++;
      } catch (error) {
        console.error('Error creating CAALM event from Outlook event:', error);
        console.error('Outlook event data:', outlookEvent);
        // Enhanced error logging for debugging
        const errorDetails = {
          eventId: outlookEvent.id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'create',
          eventData: {
            subject: outlookEvent.subject,
            start: outlookEvent.start,
            end: outlookEvent.end,
            body: outlookEvent.body,
          },
          stack: error instanceof Error ? error.stack : undefined,
        };

        console.error('Detailed Outlook to CAALM error:', errorDetails);
        result.errors.push(errorDetails);
      }
    }

    // Analyze error patterns for debugging
    if (result.errors.length > 0) {
      result.success = false;

      // Categorize errors for better debugging
      const errorCategories = {
        validation: result.errors.filter(
          (e) => e.error.includes('Event') || e.error.includes('Invalid')
        ),
        network: result.errors.filter(
          (e) => e.error.includes('timeout') || e.error.includes('network')
        ),
        permission: result.errors.filter(
          (e) =>
            e.error.includes('401') ||
            e.error.includes('403') ||
            e.error.includes('Unauthorized')
        ),
        malformed: result.errors.filter(
          (e) => e.error.includes('malformed') || e.error.includes('InvalidId')
        ),
        other: result.errors.filter(
          (e) =>
            !e.error.includes('Event') &&
            !e.error.includes('Invalid') &&
            !e.error.includes('timeout') &&
            !e.error.includes('network') &&
            !e.error.includes('401') &&
            !e.error.includes('403') &&
            !e.error.includes('Unauthorized') &&
            !e.error.includes('malformed') &&
            !e.error.includes('InvalidId')
        ),
      };

      console.log('Error analysis:', {
        total: result.errors.length,
        categories: {
          validation: errorCategories.validation.length,
          network: errorCategories.network.length,
          permission: errorCategories.permission.length,
          malformed: errorCategories.malformed.length,
          other: errorCategories.other.length,
        },
        sampleErrors: {
          validation: errorCategories.validation.slice(0, 2),
          network: errorCategories.network.slice(0, 2),
          permission: errorCategories.permission.slice(0, 2),
          malformed: errorCategories.malformed.slice(0, 2),
          other: errorCategories.other.slice(0, 2),
        },
      });
    }
  } catch (error) {
    console.error('Error in performBidirectionalSync:', error);
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
  // Normalize the event data for consistent key generation
  const title = (event.title || event.subject || '').toLowerCase().trim();
  const startDateTime = event.start?.dateTime || event.date || '';

  // Extract just the date part for comparison (YYYY-MM-DD)
  let datePart = '';
  if (startDateTime) {
    try {
      const date = new Date(startDateTime);
      datePart = date.toISOString().split('T')[0]; // Get YYYY-MM-DD
    } catch (error) {
      console.warn('Invalid date in event:', startDateTime);
      datePart = startDateTime.split('T')[0] || '';
    }
  }

  // Create a consistent key using title and date
  const normalizedTitle = title.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const key = `${normalizedTitle}_${datePart}`;

  console.log('Generated event key:', key, 'for event:', {
    title: event.title || event.subject,
    start: event.start?.dateTime || event.date,
  });

  return key;
}
