import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { getUserPermissions } from '@/lib/rbac/permissions';
import { parseStringify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || undefined;

    const permissions = await getUserPermissions(user.$id, orgId);

    return NextResponse.json({
      success: true,
      permissions: parseStringify(permissions),
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

