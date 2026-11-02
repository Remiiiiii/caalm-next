import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/licenses/utils/response.util";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import CacheManager from "@/lib/services/cache-manager";

/**
 * Soft-restore a license (clears deletedAt).
 * Permission: licenses.delete (PERMISSIONS.LICENSES.DELETE)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.DELETE,
			requireOrg: true,
		});
		if (permissionCheck) return permissionCheck;

		const { id } = await params;
		if (!id) {
			return errorResponse("Not found", 404, { requestId });
		}

		const user = await getCurrentUser();
		const userName =
			(user as { fullName?: string } | null)?.fullName || user?.email || "User";

		const license = await LicenseService.restoreLicense(id, {
			userId: user?.$id,
			userName,
			userEmail: user?.email,
		});

		revalidateTag("licenses-list", "max");
		revalidatePath("/licenses");

		if (user) {
			const defaultOrg = await getUserDefaultOrganization(user.$id);
			await CacheManager.invalidateLicenses(defaultOrg?.orgId, id).catch(
				() => undefined,
			);
		}

		return successResponse(
			{ license },
			{ requestId, message: "License restored" },
		);
	} catch (error) {
		console.error("[SERVER] licenses/[id]/restore POST:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to restore license"),
			500,
			{ requestId },
		);
	}
}
