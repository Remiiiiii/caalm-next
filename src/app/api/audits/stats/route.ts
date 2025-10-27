import { NextRequest, NextResponse } from 'next/server';
import { getAuditStats } from '@/lib/services/audit-logger';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has permission to access audit logs (executive or admin only)
    if (!user.role || !['executive', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log('Fetching audit statistics for user:', user.$id);

    const stats = await getAuditStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching audit stats via API:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch audit stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
