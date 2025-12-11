import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import {
  createSharedCalendar,
  getSharedCalendarsForUser,
  addUserToSharedCalendar,
  removeUserFromSharedCalendar,
  getSharedCalendarById,
  type CreateSharedCalendarData,
} from '@/lib/actions/shared-calendar.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/services/cache-keys';

/**
 * GET /api/calendar/shared
 * Get shared calendars for the current user
 */
export async function GET(request: NextRequest) {
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

    const defaultOrg = await getUserDefaultOrganization(user.$id);
    if (!defaultOrg) {
      return NextResponse.json(
        { success: false, message: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check cache first
    const cacheKey = `calendar:shared:${user.$id}:${defaultOrg.orgId}`;
    const cachedData = await CacheManager.withCache(
      'calendar/shared',
      cacheKey,
      async () => {
        const calendars = await getSharedCalendarsForUser(
          user.$id,
          defaultOrg.orgId
        );
        return {
          calendars,
          total: calendars.length,
          timestamp: Date.now(),
        };
      },
      CACHE_TTLS.medium // 5 minutes
    );

    // Check ETag for conditional requests
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && cachedData.timestamp) {
      const etag = `"${cachedData.timestamp}"`;
      if (ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            'ETag': etag,
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        calendars: cachedData.calendars,
        total: cachedData.total,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'ETag': `"${cachedData.timestamp}"`,
        },
      }
    );
  } catch (error) {
    console.error('[SERVER] GET /api/calendar/shared] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch shared calendars',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/shared
 * Create a new shared calendar
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

    const defaultOrg = await getUserDefaultOrganization(user.$id);
    if (!defaultOrg) {
      return NextResponse.json(
        { success: false, message: 'Organization not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const calendarData: CreateSharedCalendarData = {
      name: body.name,
      description: body.description,
      ownerId: user.$id,
      ownerAccountId: userId,
      organizationId: defaultOrg.orgId,
      isTeamCalendar: body.isTeamCalendar || false,
      teamId: body.teamId,
      color: body.color,
      isPublic: body.isPublic || false,
    };

    if (!calendarData.name) {
      return NextResponse.json(
        { success: false, message: 'Calendar name is required' },
        { status: 400 }
      );
    }

    const calendar = await createSharedCalendar(calendarData);

    return NextResponse.json({
      success: true,
      calendar,
    });
  } catch (error) {
    console.error('[SERVER] POST /api/calendar/shared] Error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to create shared calendar';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for specific error types
      if (
        error.message.includes('not found') ||
        error.message.includes('not configured')
      ) {
        statusCode = 404;
      } else if (
        error.message.includes('not configured') ||
        error.message.includes('environment variable')
      ) {
        statusCode = 500;
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: statusCode }
    );
  }
}
