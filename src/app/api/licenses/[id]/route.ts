import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  generateRequestId,
} from '@/lib/api/licenses/utils/response.util';
import { requireAuth } from '@/lib/api/licenses/middleware/auth.middleware';
import { licenseCreateSchema } from '@/lib/api/licenses/schemas/license.schema';
import { LicenseService } from '@/lib/api/licenses/services/LicenseService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const license = await LicenseService.getLicenseById(id);

    if (!license) {
      return notFoundResponse('License', requestId);
    }

    return successResponse({ license }, { requestId });
  } catch (error) {
    console.error('Get license error:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to fetch license'),
      500,
      { requestId }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const validatedData = licenseCreateSchema.partial().parse(body);

    const license = await LicenseService.updateLicense(id, validatedData);

    return successResponse({ license }, { requestId, message: 'License updated successfully' });
  } catch (error) {
    console.error('Update license error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse('Validation failed', 400, {
        requestId,
        details: (error as any).errors,
      });
    }

    return errorResponse(
      error instanceof Error ? error : new Error('Failed to update license'),
      500,
      { requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    await LicenseService.deleteLicense(id);

    return successResponse({ success: true }, { requestId, message: 'License deleted successfully' });
  } catch (error) {
    console.error('Delete license error:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to delete license'),
      500,
      { requestId }
    );
  }
}
