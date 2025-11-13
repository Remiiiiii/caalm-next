import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'node-appwrite';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { getOrgIdFromRequest } from '@/lib/rbac/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.USERS.VIEW,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const { userId } = await params;
    const orgId = await getOrgIdFromRequest(request);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization context required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();
    const userRoles = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'user_roles',
      queries: [
        Query.equal('userId', userId),
        Query.equal('orgId', orgId),
        Query.limit(100),
      ],
    });

    // Fetch role details
    const roleIds = userRoles.rows.map((ur: any) => ur.roleId);
    const roles = await Promise.all(
      roleIds.map(async (roleId: string) => {
        try {
          const role = await tablesDB.getRow(
            appwriteConfig.databaseId || 'default-db',
            'roles',
            roleId
          );
          return role;
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        assignments: userRoles.rows,
        roles: roles.filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user roles' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.USERS.ASSIGN_ROLES,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const { userId } = await params;
    const { roleId, orgId } = await request.json();

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    const targetOrgId = orgId || (await getOrgIdFromRequest(request));
    if (!targetOrgId) {
      return NextResponse.json(
        { success: false, error: 'Organization context required' },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Remove existing role assignments for this user in this org
    const existingRoles = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'user_roles',
      queries: [
        Query.equal('userId', userId),
        Query.equal('orgId', targetOrgId),
        Query.limit(100),
      ],
    });

    for (const ur of existingRoles.rows) {
      await tablesDB.deleteRow(
        appwriteConfig.databaseId || 'default-db',
        'user_roles',
        ur.$id
      );
    }

    // Assign new role
    const assignment = await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'user_roles',
      rowId: ID.unique(),
      data: {
        userId: userId,
        roleId,
        orgId: targetOrgId,
        assignedBy: currentUser.$id,
        assignedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error('Error assigning role to user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign role' },
      { status: 500 }
    );
  }
}

