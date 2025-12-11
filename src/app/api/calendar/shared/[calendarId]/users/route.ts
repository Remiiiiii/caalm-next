import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import {
  addUserToSharedCalendar,
  removeUserFromSharedCalendar,
  getSharedCalendarById,
} from '@/lib/actions/shared-calendar.actions';
import { getUserByAccountId, getUserById } from '@/lib/actions/user.actions';
import { sendCalendarSharedNotification } from '@/lib/services/calendar-notifications.service';
import CacheManager from '@/lib/services/cache-manager';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';

/**
 * PUT /api/calendar/shared/[calendarId]/users
 * Add or remove users from a shared calendar
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { calendarId: string } }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserByAccountId(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { calendarId } = await params;
    const body = await request.json();
    const { action, userId: targetUserId } = body;

    if (!action || !targetUserId) {
      return NextResponse.json(
        { success: false, message: 'Action and user ID are required' },
        { status: 400 }
      );
    }

    // Verify the current user owns the calendar
    const calendar = await getSharedCalendarById(calendarId);
    if (!calendar) {
      return NextResponse.json(
        { success: false, message: 'Shared calendar not found' },
        { status: 404 }
      );
    }

    if (calendar.ownerId !== user.$id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only the calendar owner can manage shared users',
        },
        { status: 403 }
      );
    }

    let updatedCalendar: any;

    if (action === 'add') {
      updatedCalendar = await addUserToSharedCalendar(calendarId, targetUserId);

      // Invalidate cache for both sender and recipient to ensure immediate updates
      const senderOrg = await getUserDefaultOrganization(user.$id);
      const recipientOrg = await getUserDefaultOrganization(targetUserId);
      if (senderOrg) {
        await CacheManager.invalidateCalendar(undefined, undefined, user.$id, senderOrg.orgId);
      }
      if (recipientOrg) {
        await CacheManager.invalidateCalendar(undefined, undefined, targetUserId, recipientOrg.orgId);
      }

      // Send notification asynchronously (fire-and-forget) for instant response
      Promise.resolve().then(async () => {
        try {
          const recipientUser = await getUserById(targetUserId);
          const ownerName = user.fullName || 'A user';
          const calendarName = calendar.name || 'Shared Calendar';
          const recipientEmail = recipientUser?.email;
          const ownerEmail = user.email || 'user@caalmsolutions.com';

          if (recipientUser) {
            await sendCalendarSharedNotification(
              targetUserId,
              calendarName,
              ownerName,
              ownerEmail,
              calendarId,
              recipientEmail
            );
            console.log(
              '[SERVER] PUT /api/calendar/shared/[calendarId]/users] Sent calendar sharing notification'
            );
          }
        } catch (notificationError) {
          console.error(
            '[SERVER] PUT /api/calendar/shared/[calendarId]/users] Error sending notification:',
            notificationError
          );
        }
      });
    } else if (action === 'remove') {
      updatedCalendar = await removeUserFromSharedCalendar(
        calendarId,
        targetUserId
      );

      // Invalidate cache for both sender and recipient
      const senderOrg = await getUserDefaultOrganization(user.$id);
      const recipientOrg = await getUserDefaultOrganization(targetUserId);
      if (senderOrg) {
        await CacheManager.invalidateCalendar(undefined, undefined, user.$id, senderOrg.orgId);
      }
      if (recipientOrg) {
        await CacheManager.invalidateCalendar(undefined, undefined, targetUserId, recipientOrg.orgId);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "add" or "remove"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      calendar: updatedCalendar,
    });
  } catch (error) {
    console.error(
      '[SERVER] PUT /api/calendar/shared/[calendarId]/users] Error:',
      error
    );
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update shared calendar',
      },
      { status: 500 }
    );
  }
}
