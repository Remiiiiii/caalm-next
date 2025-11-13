import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';

export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.USERS.ASSIGN_ROLES,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const { tablesDB } = await createAdminClient();
    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'permissions',
      queries: [Query.limit(1000)],
    });

    // Group permissions by category
    const permissionsByCategory = result.rows.reduce((acc: Record<string, any[]>, perm: any) => {
      const category = perm.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        all: result.rows,
        byCategory: permissionsByCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

