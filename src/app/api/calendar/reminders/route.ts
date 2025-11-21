import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import {
  createEventReminder,
  type CreateReminderData,
} from '@/lib/services/calendar-notifications.service';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';

/**
 * POST /api/calendar/reminders
 * Create a reminder for a calendar event
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.EVENTS.CREATE,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

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

    const body = await request.json();
    const reminderData: CreateReminderData = {
      eventId: body.eventId,
      userId: user.$id,
      reminderType: body.reminderType || 'before_start',
      reminderMinutes: body.reminderMinutes || 15,
      channels: body.channels || ['in_app'],
    };

    if (!reminderData.eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Validate reminder minutes
    if (reminderData.reminderMinutes < 0) {
      return NextResponse.json(
        { success: false, message: 'Reminder minutes must be non-negative' },
        { status: 400 }
      );
    }

    // Validate channels
    const validChannels = ['in_app', 'email', 'sms', 'push'];
    const invalidChannels = reminderData.channels.filter(
      (ch) => !validChannels.includes(ch)
    );
    if (invalidChannels.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid channels: ${invalidChannels.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const reminder = await createEventReminder(reminderData);

    return NextResponse.json({
      success: true,
      reminder,
    });
  } catch (error) {
    console.error('[SERVER] POST /api/calendar/reminders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create reminder',
      },
      { status: 500 }
    );
  }
}

