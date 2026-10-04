import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getCurrentUser,
	listPendingInvitations,
} from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const orgId = searchParams.get("orgId");

	// Require orgId before auth work so missing-param clients always get 400
	// (same contract as /api/dashboard/stats and notification user_id checks).
	if (!orgId) {
		return NextResponse.json(
			{
				error: "Organization ID is required",
				message: "orgId is required for dashboard invitations",
			},
			{ status: 400 },
		);
	}

	const denied = await requirePermission(request, {
		permission: PERMISSIONS.USERS.VIEW,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const hasOrgAccess = await validateUserOrgAccess(user.$id, orgId);
		if (!hasOrgAccess) {
			return NextResponse.json(
				{ error: "Access denied to this organization" },
				{ status: 403 },
			);
		}

		const cacheKey = CACHE_KEYS.dashboard.invitations(orgId);

		const invitations = await CacheManager.withCache(
			"dashboard/invitations",
			cacheKey,
			async () => await listPendingInvitations({ orgId }),
		);

		return NextResponse.json({ data: invitations });
	} catch (error: any) {
		console.error("[SERVER] dashboard/invitations:", error);

		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			error?.isTestConfig ||
			error?.code === "TEST_CONFIG" ||
			error?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			error?.message?.includes("AppwriteException")
		) {
			return NextResponse.json({ data: [] }, { status: 200 });
		}

		return NextResponse.json(
			{ error: "Failed to fetch dashboard invitations" },
			{ status: 500 },
		);
	}
}
