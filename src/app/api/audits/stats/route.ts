import { NextRequest, NextResponse } from 'next/server';
import { getAuditStats } from '@/lib/services/audit-logger';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';

export async function GET(request: NextRequest) {
  try {
    // Check permission
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.AUDIT.VIEW,
    });

    if (permissionCheck) {
      return permissionCheck;
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
