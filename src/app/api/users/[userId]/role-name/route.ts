import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/rbac/roles';
import { getLegacyRoleDisplayName } from '@/lib/utils/role-display';

/**
 * Get role display name for a user
 * Accepts either roleId or legacy role string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');
    const legacyRole = searchParams.get('role');

    if (roleId) {
      // Fetch role name from database
      const role = await getRole(roleId);
      if (role) {
        return NextResponse.json({
          success: true,
          roleName: role.name,
        });
      }
    }

    if (legacyRole) {
      // Use legacy role mapping
      const roleName = getLegacyRoleDisplayName(legacyRole);
      return NextResponse.json({
        success: true,
        roleName,
      });
    }

    return NextResponse.json(
      { success: false, error: 'roleId or role parameter required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching role name:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch role name' },
      { status: 500 }
    );
  }
}

