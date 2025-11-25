import { NextRequest, NextResponse } from 'next/server';
import {
  createCalendarEvent,
  getCalendarEventsByMonth,
  deleteCalendarEvent,
  getCalendarEventById,
  updateCalendarEvent,
  type CreateCalendarEventData,
  type CalendarEvent,
} from '@/lib/actions/calendar.actions';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { logAuditEvent } from '@/lib/services/audit-logger';
import { syncDeletionToOutlook } from '@/lib/services/deletion-sync';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/services/cache-keys';
import { evaluateCalendarPermission } from '@/lib/auth/guards';
import { createCalendarApprovalRequest } from '@/lib/actions/calendar-approval.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import {
  detectParticipantConflicts,
  detectResourceConflicts,
  suggestAlternateSlots,
} from '@/lib/utils/conflict-detection';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { createEventReminder } from '@/lib/services/calendar-notifications.service';
import {
  createResourceBooking,
  checkResourceAvailability,
} from '@/lib/actions/resource-management.actions';

const buildPermissionErrorResponse = (
  reason: string,
  requiredApproval?: boolean
) => {
  // Provide user-friendly messages based on the reason
  let message = 'Permission denied';
  if (reason === 'pending_approval') {
    message =
      'Events with pending approval status cannot be updated. Please wait for the approval decision before making changes.';
  } else if (reason === 'permission_denied') {
    message = 'You do not have permission to perform this action.';
  } else if (reason === 'user_not_found') {
    message = 'User not found.';
  }

  return NextResponse.json(
    {
      success: false,
      message,
      reason,
      requiredApproval: Boolean(requiredApproval),
    },
    {
      status:
        reason === 'user_not_found'
          ? 404
          : reason === 'pending_approval'
          ? 409
          : 403,
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // console.log(
    //   '[POST /api/calendar/events] Checking permissions for userId:',
    //   userId
    // );
    const permissionCheck = await evaluateCalendarPermission({
      userAccountId: userId,
      action: 'create',
    });

    // console.log('[POST /api/calendar/events] Permission check result:', {
    //   allowed: permissionCheck.allowed,
    //   reason: permissionCheck.reason,
    //   userRole: permissionCheck.userRole,
    //   userId: permissionCheck.userId,
    // });

    if (!permissionCheck.allowed) {
      console.error('[POST /api/calendar/events] Permission denied:', {
        reason: permissionCheck.reason,
        userRole: permissionCheck.userRole,
        userId: permissionCheck.userId,
      });
      return buildPermissionErrorResponse(
        permissionCheck.reason || 'permission_denied',
        permissionCheck.requiredApproval
      );
    }

    let eventData: Partial<CreateCalendarEventData> & Record<string, unknown>;
    try {
      eventData = await request.json();
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!eventData.title || !eventData.startDate) {
      return NextResponse.json(
        { success: false, message: 'Title and startDate are required' },
        { status: 400 }
      );
    }

    // Validate that event is not in the past
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [startYear, startMonth, startDay] = (eventData.startDate as string)
      .split('-')
      .map(Number);
    const eventStartDate = new Date(startYear, startMonth - 1, startDay);

    // Check if the date is in the past
    if (eventStartDate < today) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Cannot create events in the past. Please select a current or future date.',
        },
        { status: 400 }
      );
    }

    // If date is today, check if the time is in the past
    if (eventStartDate.getTime() === today.getTime() && eventData.startTime) {
      const timeStr = eventData.startTime as string;
      let hour24 = 0;
      let minutes = 0;

      // Handle 12-hour format (e.g., "2:00 PM")
      if (timeStr.includes('PM') || timeStr.includes('AM')) {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
          hour24 = parseInt(match[1]);
          minutes = parseInt(match[2]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hour24 !== 12) {
            hour24 += 12;
          } else if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
          }
        }
      } else {
        // Handle 24-hour format (e.g., "14:00")
        const [h, m] = timeStr.split(':').map(Number);
        hour24 = h;
        minutes = m || 0;
      }

      const eventDateTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour24,
        minutes
      );

      if (eventDateTime < now) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Cannot create events in the past. Please select a current or future time.',
          },
          { status: 400 }
        );
      }
    }

    // Check for conflicts (blocking - requires user confirmation)
    let conflictInfo: {
      conflicts: any[];
      alternateSlots: any[];
    } | null = null;
    try {
      const participantConflicts = await detectParticipantConflicts(
        eventData,
        undefined,
        userId
      );
      const resourceConflicts = await detectResourceConflicts(
        eventData,
        undefined,
        userId
      );
      const allConflicts = [...participantConflicts, ...resourceConflicts];

      if (allConflicts.length > 0) {
        const alternateSlots = await suggestAlternateSlots(eventData);
        conflictInfo = { conflicts: allConflicts, alternateSlots };

        // Check if user explicitly confirmed to proceed with conflicts
        const forceCreate =
          eventData.forceCreate === true || eventData.forceCreate === 'true';

        if (!forceCreate) {
          // Block creation and return conflicts for user confirmation
          return NextResponse.json(
            {
              success: false,
              message:
                'Conflicts detected. Please review and confirm to proceed.',
              conflicts: allConflicts,
              alternateSlots,
              requiresConfirmation: true,
            },
            { status: 409 } // 409 Conflict status code
          );
        }
      }
    } catch (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      // If conflict check fails, allow creation to proceed (fail open)
    }

    // Add the user ID to the event data
    const requestedSensitivityLevel =
      (eventData.sensitivityLevel as
        | 'standard'
        | 'restricted'
        | 'confidential') || 'standard';

    const eventWithUser: CreateCalendarEventData = {
      title: eventData.title as string,
      startDate: eventData.startDate as string,
      endDate: (eventData.endDate as string) || (eventData.startDate as string),
      type:
        (eventData.type as
          | 'contract'
          | 'deadline'
          | 'meeting'
          | 'review'
          | 'audit') || 'meeting',
      description: (eventData.description as string) || '',
      startTime: (eventData.startTime as string) || '',
      endTime: (eventData.endTime as string) || '',
      createdBy: userId,
      createdByAccountId: userId,
      createdByUserId: permissionCheck.userId || undefined,
      contractName: (eventData.contractName as string) || '',
      participants: (eventData.participants as string) || '',
      location: (eventData.location as string) || undefined,
      attachments: Array.isArray(eventData.attachments)
        ? eventData.attachments
        : undefined,
      sensitivityLevel: requestedSensitivityLevel,
      requiresApproval: requestedSensitivityLevel !== 'standard',
      approvalStatus:
        requestedSensitivityLevel !== 'standard' ? 'pending' : 'not_required',
      overrides: Array.isArray(eventData.overrides)
        ? eventData.overrides
        : undefined,
    };

    const sensitivityLevel = eventWithUser.sensitivityLevel || 'standard';
    const requiresApproval =
      Boolean(eventData.requiresApproval) || sensitivityLevel !== 'standard';

    if (requiresApproval) {
      eventWithUser.requiresApproval = true;
      eventWithUser.approvalStatus = 'pending';
      eventWithUser.sensitivityLevel = sensitivityLevel;
    }

    console.log('Creating calendar event via API:', eventWithUser);

    let createdEvent;
    try {
      createdEvent = await createCalendarEvent(eventWithUser);
    } catch (createError: any) {
      console.error('Error creating calendar event:', {
        error: createError,
        message: createError?.message,
        code: createError?.code,
        type: createError?.type,
        response: createError?.response,
        stack: createError?.stack,
      });

      return NextResponse.json(
        {
          success: false,
          message: createError?.message || 'Failed to create calendar event',
          error: {
            code: createError?.code,
            type: createError?.type,
            details: createError?.response || createError?.message,
          },
        },
        { status: 500 }
      );
    }

    let pendingApprovalId: string | null = null;

    if (requiresApproval && createdEvent.$id) {
      const approval = await createCalendarApprovalRequest({
        eventId: createdEvent.$id,
        changeType: 'create',
        requestedByAccountId: userId,
        requestedByUserId: permissionCheck.userId || undefined,
        changeSummary: {
          before: null,
          after: eventWithUser as unknown as Record<string, unknown>,
        },
        sensitivityLevel,
      });

      pendingApprovalId = approval.$id;
      await updateCalendarEvent(createdEvent.$id, {
        pendingApprovalId,
      });
    }

    // Note: Audit logging for 'create' action is not supported by the current schema
    // The audit logs collection only supports: delete, sync_delete, restore, cleanup

    // Priority 2: Handle resource booking if location is specified
    let resourceBookingId: string | null = null;
    if (eventData.location && createdEvent.$id) {
      try {
        // Check if location matches a resource
        const { getResources } = await import('@/lib/actions/resource-management.actions');
        const defaultOrg = await getUserDefaultOrganization(permissionCheck.userId || userId);
        if (defaultOrg) {
          const resources = await getResources(defaultOrg.orgId);
          const matchingResource = resources.find(
            (r) => r.name.toLowerCase() === (eventData.location as string).toLowerCase() ||
                   (r.location && r.location.toLowerCase() === (eventData.location as string).toLowerCase())
          );

          if (matchingResource) {
            // Check availability
            const availability = await checkResourceAvailability(
              matchingResource.$id,
              eventData.startDate as string,
              eventData.endDate || eventData.startDate,
              eventData.startTime || '00:00',
              eventData.endTime || '23:59'
            );

            if (availability.available) {
              // Create resource booking
              const booking = await createResourceBooking({
                resourceId: matchingResource.$id,
                eventId: createdEvent.$id,
                startDate: eventData.startDate as string,
                endDate: eventData.endDate || eventData.startDate,
                startTime: eventData.startTime || '00:00',
                endTime: eventData.endTime || '23:59',
                requestedBy: permissionCheck.userId || userId,
                requestedByAccountId: userId,
              });
              resourceBookingId = booking.$id;

              // If booking requires approval, add to response
              if (booking.status === 'pending') {
                console.log('[SERVER] POST /api/calendar/events] Resource booking requires approval');
              }
            } else {
              console.warn('[SERVER] POST /api/calendar/events] Resource not available:', availability.reason);
            }
          }
        }
      } catch (resourceError) {
        console.error('[SERVER] POST /api/calendar/events] Error handling resource booking:', resourceError);
        // Don't fail event creation if resource booking fails
      }
    }

    // Priority 2: Create default reminders if specified
    if (eventData.reminders && Array.isArray(eventData.reminders) && createdEvent.$id) {
      try {
        for (const reminderConfig of eventData.reminders) {
          await createEventReminder({
            eventId: createdEvent.$id,
            userId: permissionCheck.userId || userId,
            reminderType: reminderConfig.type || 'before_start',
            reminderMinutes: reminderConfig.minutes || 15,
            channels: reminderConfig.channels || ['in_app'],
          });
        }
        console.log('[SERVER] POST /api/calendar/events] Created reminders for event');
      } catch (reminderError) {
        console.error('[SERVER] POST /api/calendar/events] Error creating reminders:', reminderError);
        // Don't fail event creation if reminder creation fails
      }
    }

    // Invalidate calendar cache for the month
    // Parse date string safely to avoid timezone shifts
    if (!eventData.startDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'startDate is required for cache invalidation',
        },
        { status: 400 }
      );
    }
    const dateStr = (eventData.startDate as string).split('T')[0]; // Get just YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);
    await CacheManager.invalidateCalendar(
      eventDate.getFullYear(),
      eventDate.getMonth() + 1
    );

    return NextResponse.json({
      success: true,
      event: pendingApprovalId
        ? {
            ...createdEvent,
            pendingApprovalId,
            approvalStatus: 'pending',
            requiresApproval: true,
          }
        : createdEvent,
      approval:
        pendingApprovalId !== null
          ? {
              id: pendingApprovalId,
              status: 'pending',
            }
          : null,
      conflicts: conflictInfo?.conflicts || [],
      alternateSlots: conflictInfo?.alternateSlots || [],
    });
  } catch (error: any) {
    console.error('Error creating calendar event via API:', {
      error,
      message: error?.message,
      code: error?.code,
      type: error?.type,
      response: error?.response,
      stack: error?.stack,
    });

    // Extract error details for client
    const errorMessage = error?.message || 'Failed to create event';
    const errorCode = error?.code || 'unknown';
    const errorType = error?.type || 'general_unknown';
    const errorResponse = error?.response || errorMessage;

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: {
          code: errorCode,
          type: errorType,
          details:
            typeof errorResponse === 'string'
              ? errorResponse
              : JSON.stringify(errorResponse),
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const accountId = await getCurrentUserId();

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user by account ID to get the user's $id (userId)
    const user = await getUserByAccountId(accountId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user.$id;

    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get('year') || new Date().getFullYear().toString()
    );
    const month = parseInt(
      searchParams.get('month') || (new Date().getMonth() + 1).toString()
    );

    //console.log('Fetching calendar events for:', { year, month, userId });

    const noCacheHeader = request.headers.get('x-no-cache') === '1';
    const noCacheQuery =
      (request.nextUrl.searchParams.get('noCache') || '') === '1';

    let payload: any;
    if (noCacheHeader || noCacheQuery) {
      // Bypass server cache entirely
      const events = await getCalendarEventsByMonth(year, month, userId);
      payload = { success: true, events };
    } else {
      // Use server cache with user-specific cache key
      const cacheKey = CACHE_KEYS.calendar.events(year, month, userId);
      payload = await CacheManager.withCache(
        'calendar/events',
        cacheKey,
        async () => {
          const events = await getCalendarEventsByMonth(year, month, userId);
          return { success: true, events };
        },
        CACHE_TTLS.medium
      );
    }

    const res = NextResponse.json(payload);
    // Prevent downstream/proxy caches from serving stale data to clients
    res.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
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

export async function PUT(request: NextRequest) {
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

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const eventData = body as Partial<CreateCalendarEventData>;

    console.log('Updating calendar event via API:', {
      eventId,
      userId,
      eventData,
    });

    const event = await getCalendarEventById(eventId);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    const permissionCheck = await evaluateCalendarPermission({
      userAccountId: userId,
      action: 'update',
      event,
    });

    if (!permissionCheck.allowed) {
      return buildPermissionErrorResponse(
        permissionCheck.reason || 'permission_denied',
        permissionCheck.requiredApproval
      );
    }

    // Check for conflicts (blocking - requires user confirmation)
    let conflictInfo: {
      conflicts: any[];
      alternateSlots: any[];
    } | null = null;
    try {
      const participantConflicts = await detectParticipantConflicts(
        eventData,
        eventId,
        userId
      );
      const resourceConflicts = await detectResourceConflicts(
        eventData,
        eventId,
        userId
      );
      const allConflicts = [...participantConflicts, ...resourceConflicts];

      if (allConflicts.length > 0) {
        const alternateSlots = await suggestAlternateSlots(eventData, eventId);
        conflictInfo = { conflicts: allConflicts, alternateSlots };

        // Check if user explicitly confirmed to proceed with conflicts
        const forceCreate =
          (eventData as Record<string, unknown>).forceCreate === true ||
          String((eventData as Record<string, unknown>).forceCreate) === 'true';

        if (!forceCreate) {
          // Block update and return conflicts for user confirmation
          return NextResponse.json(
            {
              success: false,
              message:
                'Conflicts detected. Please review and confirm to proceed.',
              conflicts: allConflicts,
              alternateSlots,
              requiresConfirmation: true,
            },
            { status: 409 } // 409 Conflict status code
          );
        }
      }
    } catch (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      // If conflict check fails, allow update to proceed (fail open)
    }

    // Check if event requires approval for updates
    const sensitivityLevel =
      eventData.sensitivityLevel || event.sensitivityLevel || 'standard';
    const requiresApproval =
      Boolean(eventData.requiresApproval) ||
      sensitivityLevel === 'restricted' ||
      sensitivityLevel === 'confidential';

    let updatedEvent: CalendarEvent;
    let pendingApprovalId: string | null = null;

    // Simplified flow: Always create new approval request if approval is required
    // This creates a clear history of all submission attempts
    if (requiresApproval && event.approvalStatus !== 'approved') {
      // Create new approval request (even for resubmissions after changes_requested)
      const approval = await createCalendarApprovalRequest({
        eventId,
        changeType: 'update',
        requestedByAccountId: userId,
        requestedByUserId: permissionCheck.userId || undefined,
        changeSummary: {
          before: event as unknown as Record<string, unknown>,
          after: { ...event, ...eventData } as unknown as Record<
            string,
            unknown
          >,
        },
        sensitivityLevel,
      });

      pendingApprovalId = approval.$id;

      // Update event with pending approval status
      updatedEvent = await updateCalendarEvent(eventId, {
        ...eventData,
        approvalStatus: 'pending',
        pendingApprovalId,
      });
    } else {
      // Update event directly (no approval required)
      updatedEvent = await updateCalendarEvent(eventId, eventData);
    }

    // Note: Audit logging for 'update' action is not supported by the current schema
    // The audit logs collection only supports: delete, sync_delete, restore, cleanup

    // Invalidate calendar cache for the month
    if (eventData.startDate || event.startDate) {
      const dateStr = (eventData.startDate || event.startDate) as string;
      const datePart = dateStr.split('T')[0];
      const [year, month] = datePart.split('-').map(Number);
      await CacheManager.invalidateCalendar(year, month);
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      approval:
        pendingApprovalId !== null
          ? {
              id: pendingApprovalId,
              status: 'pending',
            }
          : null,
      conflicts: conflictInfo?.conflicts || [],
      alternateSlots: conflictInfo?.alternateSlots || [],
    });
  } catch (error) {
    console.error('Error updating calendar event via API:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to update event',
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

    const event = await getCalendarEventById(eventId);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    const permissionCheck = await evaluateCalendarPermission({
      userAccountId: userId,
      action: 'cancel',
      event,
    });

    if (!permissionCheck.allowed) {
      // If permission is denied due to pending approval, check if we can create a cancellation approval
      if (permissionCheck.reason === 'pending_approval') {
        // Check if there's already a pending cancellation approval
        const { listCalendarApprovalRequests } = await import(
          '@/lib/actions/calendar-approval.actions'
        );
        const pendingApprovals = await listCalendarApprovalRequests({
          status: 'pending',
        });
        const existingCancelApproval = pendingApprovals.find(
          (approval) =>
            approval.eventId === eventId && approval.changeType === 'cancel'
        );

        if (existingCancelApproval) {
          // Already has a pending cancellation approval
          return NextResponse.json(
            {
              success: false,
              message: 'A cancellation request is already pending approval',
              reason: 'pending_approval',
              approvalId: existingCancelApproval.$id,
            },
            { status: 409 }
          );
        }

        // Allow creating a cancellation approval even if there's a pending creation approval
        // The permission check blocking was removed for cancellation actions
      } else {
        // Other permission denials
        return buildPermissionErrorResponse(
          permissionCheck.reason || 'permission_denied',
          permissionCheck.requiredApproval
        );
      }
    }

    const sensitivityLevel = event.sensitivityLevel || 'standard';
    const requiresApproval =
      Boolean(event.requiresApproval) ||
      sensitivityLevel === 'restricted' ||
      sensitivityLevel === 'confidential';

    // Check if there's already a pending cancellation approval
    const { listCalendarApprovalRequests } = await import(
      '@/lib/actions/calendar-approval.actions'
    );
    const pendingApprovals = await listCalendarApprovalRequests({
      status: 'pending',
    });
    const existingCancelApproval = pendingApprovals.find(
      (approval) =>
        approval.eventId === eventId && approval.changeType === 'cancel'
    );

    if (existingCancelApproval) {
      return NextResponse.json(
        {
          success: false,
          message: 'A cancellation request is already pending approval',
          reason: 'pending_approval',
          approvalId: existingCancelApproval.$id,
        },
        { status: 409 }
      );
    }

    if (requiresApproval) {
      const approval = await createCalendarApprovalRequest({
        eventId,
        changeType: 'cancel',
        requestedByAccountId: userId,
        requestedByUserId: permissionCheck.userId || undefined,
        changeSummary: {
          before: event as unknown as Record<string, unknown>,
          after: null,
        },
        sensitivityLevel,
      });

      await updateCalendarEvent(eventId, {
        approvalStatus: 'pending',
        pendingApprovalId: approval.$id,
      });

      return NextResponse.json({
        success: true,
        message: 'Cancellation pending approval',
        approvalId: approval.$id,
        requiresApproval: true,
      });
    }

    // Get event title for audit logging (event already fetched above)
    const eventTitle = event?.title || 'Unknown Event';

    // Perform soft delete immediately
    await deleteCalendarEvent(eventId, userId);

    // Get client IP and user agent for audit
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Get user information for audit logging
    let userName = 'Unknown User';
    let userEmail = 'unknown@example.com';
    let auditUserId = userId;
    let orgId: string | undefined;
    try {
      const user = await getUserByAccountId(userId);
      if (user) {
        userName = user.fullName || 'Unknown User';
        userEmail = user.email || 'unknown@example.com';
        auditUserId = user.$id || userId;
        const defaultOrg = await getUserDefaultOrganization(user.$id);
        orgId = defaultOrg?.orgId;
      }
    } catch (userError) {
      console.warn('Could not fetch user details for audit:', userError);
    }

    // Log the deletion audit event
    await logAuditEvent({
      event_id: eventId,
      event_title: eventTitle,
      action: 'delete',
      source: 'caalm',
      user_id: auditUserId,
      user_name: userName,
      user_email: userEmail,
      orgId: orgId,
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

    // Invalidate all calendar caches (event could be in any month)
    await CacheManager.invalidateCalendar();

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
        // Try to get orgId from userId if available
        const deleteUserId = await getCurrentUserId();
        let orgId: string | undefined;
        let userName = 'Unknown User';
        let userEmail = 'unknown@example.com';
        let auditUserId = deleteUserId || 'unknown';
        try {
          if (deleteUserId) {
            const user = await getUserByAccountId(deleteUserId);
            if (user?.$id) {
              userName = user.fullName || 'Unknown User';
              userEmail = user.email || 'unknown@example.com';
              auditUserId = user.$id;
              const defaultOrg = await getUserDefaultOrganization(user.$id);
              orgId = defaultOrg?.orgId;
            }
          }
        } catch {
          // Ignore errors getting orgId for failed deletion log
        }

        await logAuditEvent({
          event_id: eventId,
          event_title: 'Unknown Event',
          action: 'delete',
          source: 'caalm',
          user_id: auditUserId,
          user_name: userName,
          user_email: userEmail,
          orgId: orgId,
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
