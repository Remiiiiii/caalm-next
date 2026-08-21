import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import {
	licenseCreateSchema,
	licenseListQuerySchema,
} from "@/lib/api/licenses/schemas/license.schema";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import {
	buildPaginationMeta,
	parsePaginationParams,
} from "@/lib/api/licenses/utils/pagination.util";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/licenses/utils/response.util";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse("User not found", 401, { requestId });
		}

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.VIEW,
		});
		if (permissionCheck) return permissionCheck;

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return errorResponse("Organization not found", 404, { requestId });
		}

		const { searchParams } = new URL(request.url);
		// Normalize null/empty to undefined so Zod optional/default apply (avoids "expected string, received null" and limit too_small)
		const q = (name: string) => searchParams.get(name) ?? undefined;
		const queryParams = {
			limit: q("limit") || undefined,
			offset: q("offset") || undefined,
			search: q("search") || undefined,
			vendor: q("vendor") || undefined,
			licenseType: q("licenseType") || undefined,
			status: q("status") || undefined,
			department: q("department") || undefined,
			expiringSoon: q("expiringSoon") || undefined,
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

		const result = await CacheManager.withCache(
			"licenses/all",
			`${CACHE_KEYS.licenses.all()}:${defaultOrg.orgId}`,
			async () =>
				LicenseService.listLicenses(defaultOrg.orgId, filters, {
					limit,
					offset,
				}),
			CACHE_TTLS.long,
		);

		const paginationMeta = buildPaginationMeta(limit, offset, result.total);

		return successResponse(
			{ licenses: result.licenses },
			{
				requestId,
				pagination: paginationMeta,
			},
		);
	} catch (error) {
		console.error("Licenses API error:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch licenses"),
			500,
			{ requestId },
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
			return errorResponse("User not found", 401, { requestId });
		}

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.CREATE,
		});
		if (permissionCheck) return permissionCheck;

		const body = await request.json();
		const validatedData = licenseCreateSchema.parse(body);

		const license = await LicenseService.createLicense(user.$id, validatedData);

		const licenseLabel =
			(license as { name?: string; title?: string })?.name ||
			(license as { title?: string })?.title ||
			"License";
		await logAuditEvent({
			event_id: `license_create_${(license as { $id?: string })?.$id || Date.now()}`,
			event_title: `License created: ${licenseLabel}`,
			action: "create",
			source: "caalm",
			user_id: user.$id,
			user_name:
				(user as { fullName?: string }).fullName || user.email || "unknown",
			user_email: user.email || "",
			status: "success",
			module: "licenses",
			target_type: "license",
			target_id: (license as { $id?: string })?.$id,
			target_label: licenseLabel,
			summary: `${(user as { fullName?: string }).fullName || user.email} created license ${licenseLabel}`,
			correlation_id: requestId,
		});

		return successResponse(
			{ license },
			{ requestId, message: "License created successfully" },
		);
	} catch (error) {
		console.error("Create license error:", error);

		if (error instanceof Error && error.name === "ZodError") {
			return errorResponse("Validation failed", 400, {
				requestId,
				details: (error as any).errors,
			});
		}

		return errorResponse(
			error instanceof Error ? error : new Error("Failed to create license"),
			500,
			{ requestId },
		);
	}
}
