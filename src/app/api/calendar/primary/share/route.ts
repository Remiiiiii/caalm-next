import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import {
  getOrCreatePrimaryCalendar,
  sharePrimaryCalendarWithUser,
  removeCalendarShare,
  getCalendarPermissionForUser,
  type CalendarPermissionLevel,
} from '@/lib/actions/shared-calendar.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';

/**
 * POST /api/calendar/primary/share
 * Share the current user's primary calendar with another user at a specific permission level
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.CALENDAR.CREATE,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const currentAccountId = await getCurrentUserId();

    if (!currentAccountId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await getUserByAccountId(currentAccountId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const defaultOrg = await getUserDefaultOrganization(currentUser.$id);
    if (!defaultOrg) {
      return NextResponse.json(
        { success: false, message: 'Organization not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { sharedWithUserId, permissionLevel } = body;

    if (!sharedWithUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID to share with is required' },
        { status: 400 }
      );
    }

    if (!permissionLevel) {
      return NextResponse.json(
        { success: false, message: 'Permission level is required' },
        { status: 400 }
      );
    }

    // Validate permission level
    const validPermissionLevels: CalendarPermissionLevel[] = [
      'view_busy',
      'view_titles',
      'view_all',
      'edit',
      'delegate',
    ];
    if (!validPermissionLevels.includes(permissionLevel)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid permission level. Must be one of: ${validPermissionLevels.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Ensure primary calendar exists for current user
    const primaryCalendar = await getOrCreatePrimaryCalendar(
      currentUser.$id,
      currentAccountId,
      defaultOrg.orgId,
      currentUser.fullName
    );

    // Share calendar with the specified user
    const updatedCalendar = await sharePrimaryCalendarWithUser(
      currentUser.$id,
      sharedWithUserId,
      permissionLevel,
      currentUser.$id
    );

    return NextResponse.json({
      success: true,
      calendar: updatedCalendar,
      message: 'Calendar shared successfully',
    });
  } catch (error) {
    console.error('[SERVER] POST /api/calendar/primary/share] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to share primary calendar',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/primary/share
 * Remove a user's access to the current user's primary calendar
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check permission
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.CALENDAR.CREATE,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const currentAccountId = await getCurrentUserId();

    if (!currentAccountId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await getUserByAccountId(currentAccountId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sharedWithUserId = searchParams.get('userId');

    if (!sharedWithUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Remove calendar share
    const updatedCalendar = await removeCalendarShare(
      currentUser.$id,
      sharedWithUserId
    );

    return NextResponse.json({
      success: true,
      calendar: updatedCalendar,
      message: 'Calendar access removed successfully',
    });
  } catch (error) {
    console.error('[SERVER] DELETE /api/calendar/primary/share] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to remove calendar access',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/primary/share
 * Get permission level for a specific user on the current user's primary calendar
 */
export async function GET(request: NextRequest) {
  try {
    const currentAccountId = await getCurrentUserId();

    if (!currentAccountId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await getUserByAccountId(currentAccountId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get permission level
    const permissionLevel = await getCalendarPermissionForUser(
      currentUser.$id,
      userId
    );

    return NextResponse.json({
      success: true,
      permissionLevel,
      hasAccess: permissionLevel !== null,
    });
  } catch (error) {
    console.error('[SERVER] GET /api/calendar/primary/share] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get calendar permission',
      },
      { status: 500 }
    );
  }
}

