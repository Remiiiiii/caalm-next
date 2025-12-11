import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';
import { listRoles } from '@/lib/rbac/roles';
import { getOrgIdFromRequest } from '@/lib/rbac/middleware';

export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.USERS.ASSIGN_ROLES,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const orgId = await getOrgIdFromRequest(request);
    const roles = await listRoles(orgId);

    return NextResponse.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.USERS.ASSIGN_ROLES,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const { name, description, orgId, permissionKeys } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Role name is required' },
        { status: 400 }
      );
    }

    const { createRole } = await import('@/lib/rbac/roles');
    const { getCurrentUser } = await import('@/lib/actions/user.actions');
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const role = await createRole(
      name,
      description || '',
      false,
      orgId || null,
      currentUser.$id,
      permissionKeys || []
    );

    return NextResponse.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create role' },
      { status: 500 }
    );
  }
}

