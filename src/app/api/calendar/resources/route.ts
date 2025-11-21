import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import {
  createResource,
  getResources,
  type CreateResourceData,
} from '@/lib/actions/resource-management.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';

/**
 * GET /api/calendar/resources
 * Get all resources for the organization
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'room' | 'equipment' | undefined;

    const resources = await getResources(defaultOrg.orgId, type);

    return NextResponse.json({
      success: true,
      resources,
      total: resources.length,
    });
  } catch (error) {
    console.error('[SERVER] GET /api/calendar/resources] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to fetch resources',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/resources
 * Create a new resource (room or equipment)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission - only admins can create resources
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.SETTINGS.EDIT,
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
    const resourceData: CreateResourceData = {
      name: body.name,
      type: body.type,
      description: body.description,
      location: body.location,
      capacity: body.capacity,
      features: body.features,
      requiresApproval: body.requiresApproval || false,
      approvalWorkflowId: body.approvalWorkflowId,
      organizationId: defaultOrg.orgId,
    };

    if (!resourceData.name || !resourceData.type) {
      return NextResponse.json(
        { success: false, message: 'Resource name and type are required' },
        { status: 400 }
      );
    }

    if (!['room', 'equipment'].includes(resourceData.type)) {
      return NextResponse.json(
        { success: false, message: 'Resource type must be "room" or "equipment"' },
        { status: 400 }
      );
    }

    const resource = await createResource(resourceData);

    return NextResponse.json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error('[SERVER] POST /api/calendar/resources] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create resource',
      },
      { status: 500 }
    );
  }
}

