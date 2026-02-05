import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/licenses/utils/response.util';
import { requireAuth } from '@/lib/api/licenses/middleware/auth.middleware';
import { parsePaginationParams, buildPaginationMeta } from '@/lib/api/licenses/utils/pagination.util';
import { licenseCreateSchema, licenseListQuerySchema } from '@/lib/api/licenses/schemas/license.schema';
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
    // Normalize null/empty to undefined so Zod optional/default apply (avoids "expected string, received null" and limit too_small)
    const q = (name: string) => searchParams.get(name) ?? undefined;
    const queryParams = {
      limit: q('limit') || undefined,
      offset: q('offset') || undefined,
      search: q('search') || undefined,
      vendor: q('vendor') || undefined,
      licenseType: q('licenseType') || undefined,
      status: q('status') || undefined,
      department: q('department') || undefined,
      expiringSoon: q('expiringSoon') || undefined,
    };

    const validatedParams = licenseListQuerySchema.parse(queryParams);
    const { limit, offset } = parsePaginationParams(request);

    const filters = {
      search: validatedParams.search,
      vendor: validatedParams.vendor,
      licenseType: validatedParams.licenseType,
      status: validatedParams.status,
      department: validatedParams.department,
      expiringSoon: validatedParams.expiringSoon,
    };

    const result = await LicenseService.listLicenses(
      defaultOrg.orgId,
      filters,
      { limit, offset }
    );

    const paginationMeta = buildPaginationMeta(limit, offset, result.total);

    return successResponse(
      { licenses: result.licenses },
      {
        requestId,
        pagination: paginationMeta,
      }
    );
  } catch (error) {
    console.error('Licenses API error:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to fetch licenses'),
      500,
      { requestId }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('User not found', 401, { requestId });
    }

    const body = await request.json();
    const validatedData = licenseCreateSchema.parse(body);

    const license = await LicenseService.createLicense(user.$id, validatedData);

    return successResponse({ license }, { requestId, message: 'License created successfully' });
  } catch (error) {
    console.error('Create license error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse('Validation failed', 400, {
        requestId,
        details: (error as any).errors,
      });
    }

    return errorResponse(
      error instanceof Error ? error : new Error('Failed to create license'),
      500,
      { requestId }
    );
  }
}
