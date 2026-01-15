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
    const reportType = searchParams.get('type') || 'summary';

    const allLicenses = await LicenseService.listLicenses(defaultOrg.orgId);

    let reportData: any = {};

    switch (reportType) {
      case 'summary':
        const totalLicenses = allLicenses.licenses.length;
        const activeLicenses = allLicenses.licenses.filter(
          (l: any) => l.status === 'active'
        ).length;
        const expiredLicenses = allLicenses.licenses.filter(
          (l: any) => l.status === 'expired'
        ).length;
        const pendingRenewal = allLicenses.licenses.filter(
          (l: any) => l.status === 'pending_renewal'
        ).length;
        const totalCost = allLicenses.licenses.reduce(
          (sum: number, l: any) => sum + (l.cost || 0),
          0
        );

        reportData = {
          totalLicenses,
          activeLicenses,
          expiredLicenses,
          pendingRenewal,
          totalCost,
        };
        break;

      case 'utilization':
        const utilizationData = allLicenses.licenses.map((l: any) => ({
          licenseId: l.$id,
          licenseName: l.licenseName,
          quantity: l.quantity || 0,
          availableQuantity: l.availableQuantity || 0,
          utilizationRate:
            l.quantity && l.quantity > 0
              ? ((l.quantity - (l.availableQuantity || 0)) / l.quantity) * 100
              : 0,
        }));

        reportData = { utilization: utilizationData };
        break;

      case 'cost':
        const costByVendor: Record<string, number> = {};
        const costByType: Record<string, number> = {};
        const costByDepartment: Record<string, number> = {};

        allLicenses.licenses.forEach((l: any) => {
          const cost = l.cost || 0;
          if (l.vendor) {
            costByVendor[l.vendor] = (costByVendor[l.vendor] || 0) + cost;
          }
          if (l.licenseType) {
            costByType[l.licenseType] = (costByType[l.licenseType] || 0) + cost;
          }
          if (l.department) {
            costByDepartment[l.department] =
              (costByDepartment[l.department] || 0) + cost;
          }
        });

        reportData = {
          costByVendor,
          costByType,
          costByDepartment,
        };
        break;

      case 'expiration':
        const expirationData = allLicenses.licenses
          .filter((l: any) => l.expirationDate)
          .map((l: any) => ({
            licenseId: l.$id,
            licenseName: l.licenseName,
            expirationDate: l.expirationDate,
            daysUntilExpiry: l.daysUntilExpiry,
            status: l.status,
          }))
          .sort((a: any, b: any) => {
            if (!a.expirationDate) return 1;
            if (!b.expirationDate) return -1;
            return a.expirationDate.localeCompare(b.expirationDate);
          });

        reportData = { expiration: expirationData };
        break;

      default:
        return errorResponse('Invalid report type', 400, { requestId });
    }

    return successResponse(reportData, { requestId });
  } catch (error) {
    console.error('Generate license report error:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to generate report'),
      500,
      { requestId }
    );
  }
}
