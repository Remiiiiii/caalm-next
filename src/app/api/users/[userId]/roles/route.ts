import { NextRequest, NextResponse } from 'next/server';
import { getUserRoles } from '@/lib/rbac/permissions';
import { getOrgIdFromRequest } from '@/lib/rbac/middleware';
import { getRole } from '@/lib/rbac/roles';

/**
 * Get user's roles with role names
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
    
    // Fetch role details for each role
    const rolesWithDetails = await Promise.all(
      userRoles.map(async (ur) => {
        try {
          const role = await getRole(ur.roleId);
          return role;
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        roles: rolesWithDetails.filter(Boolean),
        assignments: userRoles,
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

