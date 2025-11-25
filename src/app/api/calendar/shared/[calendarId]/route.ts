import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import {
  updateSharedCalendar,
  deleteSharedCalendar,
  getSharedCalendarById,
} from '@/lib/actions/shared-calendar.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';

/**
 * PUT /api/calendar/shared/[calendarId]
 * Update a shared calendar
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
          message: 'Only the calendar owner can update the calendar',
        },
        { status: 403 }
      );
    }

    // Extract allowed update fields
    const updates: {
      name?: string;
      description?: string;
      color?: string;
      isPublic?: boolean;
      isTeamCalendar?: boolean;
      teamId?: string;
    } = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.color !== undefined) updates.color = body.color;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
    if (body.isTeamCalendar !== undefined)
      updates.isTeamCalendar = body.isTeamCalendar;
    if (body.teamId !== undefined) updates.teamId = body.teamId;

    const updatedCalendar = await updateSharedCalendar(calendarId, updates);

    return NextResponse.json({
      success: true,
      calendar: updatedCalendar,
    });
  } catch (error) {
    console.error(
      '[SERVER] PUT /api/calendar/shared/[calendarId]] Error:',
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

/**
 * DELETE /api/calendar/shared/[calendarId]
 * Delete a shared calendar
 */
export async function DELETE(
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
          message: 'Only the calendar owner can delete the calendar',
        },
        { status: 403 }
      );
    }

    await deleteSharedCalendar(calendarId);

    return NextResponse.json({
      success: true,
      message: 'Shared calendar deleted successfully',
    });
  } catch (error) {
    console.error(
      '[SERVER] DELETE /api/calendar/shared/[calendarId]] Error:',
      error
    );
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete shared calendar',
      },
      { status: 500 }
    );
  }
}

