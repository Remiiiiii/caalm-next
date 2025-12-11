import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import {
  sendReminderNotification,
} from '@/lib/services/calendar-notifications.service';
import { getCalendarEventById } from '@/lib/actions/calendar.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

/**
 * POST /api/calendar/reminders/send
 * Manually trigger a reminder notification (typically called by a scheduler)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission - this endpoint should typically be called by a scheduler/service
    // For now, allow users with calendar permissions
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.CALENDAR.VIEW_ALL,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const body = await request.json();
    const { reminderId, eventId } = body;

    if (!reminderId || !eventId) {
      return NextResponse.json(
        { success: false, message: 'Reminder ID and Event ID are required' },
        { status: 400 }
      );
    }

    // Get event details
    const event = await getCalendarEventById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    // Get reminder details
    const { tablesDB } = await createAdminClient();
    const remindersCollectionId =
      process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_REMINDERS_COLLECTION ||
      'calendar_reminders';

    const reminder = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId!,
      tableId: remindersCollectionId,
      rowId: reminderId,
    });

    if (!reminder) {
      return NextResponse.json(
        { success: false, message: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Get user details for email/phone
    const user = await getUserByAccountId(reminder.userId);
    const userEmail = user?.email;
    const userPhone = user?.phone;

    // Send reminder notification
    await sendReminderNotification(
      reminder as unknown as {
        $id: string;
        eventId: string;
        userId: string;
        reminderType: 'before_start' | 'before_end' | 'custom';
        reminderMinutes: number;
        channels: Array<'in_app' | 'email' | 'sms' | 'push'>;
        isSent: boolean;
        sentAt?: string;
        createdAt: string;
      },
      event.title,
      event.startDate,
      event.startTime || '00:00',
      userEmail,
      userPhone
    );

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
    });
  } catch (error) {
    console.error('[SERVER] POST /api/calendar/reminders/send] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to send reminder',
      },
      { status: 500 }
    );
  }
}

