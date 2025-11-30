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

    // Get all users who have access to this calendar before deleting
    const recipientUserIds: string[] = [];
    
    // Collect user IDs from sharePermissions (new model)
    if (calendar.sharePermissions) {
      let sharePermissions: any[] = [];
      if (Array.isArray(calendar.sharePermissions)) {
        sharePermissions = calendar.sharePermissions;
      } else if (typeof calendar.sharePermissions === 'string') {
        try {
          sharePermissions = JSON.parse(calendar.sharePermissions);
        } catch {
          sharePermissions = [];
        }
      }
      recipientUserIds.push(...sharePermissions.map((p: any) => p.userId));
    }
    
    // Collect user IDs from sharedWith (legacy model)
    if (calendar.sharedWith) {
      let sharedWith: string[] = [];
      if (Array.isArray(calendar.sharedWith)) {
        sharedWith = calendar.sharedWith;
      } else if (typeof calendar.sharedWith === 'string') {
        try {
          sharedWith = JSON.parse(calendar.sharedWith);
        } catch {
          sharedWith = [];
        }
      }
      recipientUserIds.push(...sharedWith);
    }
    
    // Delete the calendar
    await deleteSharedCalendar(calendarId);
    
    // Invalidate cache for all recipients and the owner
    const { CacheManager } = await import('@/lib/services/cache-manager');
    const { getUserDefaultOrganization } = await import('@/lib/rbac/permissions');
    
    // Invalidate cache for owner
    const ownerOrg = await getUserDefaultOrganization(calendar.ownerId);
    if (ownerOrg) {
      await CacheManager.invalidateCalendar(undefined, undefined, calendar.ownerId, ownerOrg.orgId);
    }
    
    // Invalidate cache for all recipients
    for (const recipientId of recipientUserIds) {
      const recipientOrg = await getUserDefaultOrganization(recipientId);
      if (recipientOrg) {
        await CacheManager.invalidateCalendar(undefined, undefined, recipientId, recipientOrg.orgId);
      }
    }

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


