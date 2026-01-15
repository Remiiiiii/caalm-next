import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/licenses/utils/response.util';
import { requireAuth } from '@/lib/api/licenses/middleware/auth.middleware';
import { LicenseService } from '@/lib/api/licenses/services/LicenseService';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('User not found', 401, { requestId });
    }

    const defaultOrg = await getUserDefaultOrganization(user.$id);
    if (!defaultOrg) {
      return errorResponse('Organization not found', 404, { requestId });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const expiringLicenses = await LicenseService.getExpiringLicenses(
      defaultOrg.orgId,
      days
    );

    return successResponse(
      { licenses: expiringLicenses, count: expiringLicenses.length },
      { requestId }
    );
  } catch (error) {
    console.error('Get expiring licenses error:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to fetch expiring licenses'),
      500,
      { requestId }
    );
  }
}
