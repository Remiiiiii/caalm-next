import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/rbac/roles';

/**
 * Get role display name for a user
 * Accepts roleId parameter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

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

    return NextResponse.json(
      { success: false, error: 'roleId parameter required' },
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

