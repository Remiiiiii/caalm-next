import { NextRequest, NextResponse } from 'next/server';
import { getUserRoles } from '@/lib/rbac/permissions';
import { getOrgIdFromRequest } from '@/lib/rbac/middleware';
import { getHighestPriorityRole } from '@/lib/utils/role-priority';

/**
 * Get role display name(s) for a user
 * Returns the actual role name(s) from the database
 * When a user has multiple roles, returns the highest priority role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const orgId = await getOrgIdFromRequest(request) || 'default_organization';
    
    // Get user's roles from database
    const userRoles = await getUserRoles(userId, orgId);
    
    if (userRoles.length > 0) {
      // Get highest priority role (IT > Department Manager, etc.)
      const roleName = getHighestPriorityRole(userRoles);
      if (roleName) {
        return NextResponse.json({
          success: true,
          roleName,
          roles: userRoles.map(ur => ur.roleName).filter(Boolean),
        });
      }
    }

    return NextResponse.json({
      success: true,
      roleName: '',
      roles: [],
    });
  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user role' },
      { status: 500 }
    );
  }
}

