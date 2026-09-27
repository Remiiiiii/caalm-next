import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	countBillableUsers,
	getOrgPlanLimits,
} from "@/lib/billing/planLimits";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";

/**
 * Staff seat usage vs the org plan cap. USERS.VIEW only — no Stripe payload.
 */
export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.USERS.VIEW,
	});
	if (denied) return denied;

	try {
		const orgId = getOrgIdFromRequest(request);
		if (!orgId) {
			return NextResponse.json(
				{ error: "Organization context required" },
				{ status: 400 },
			);
		}

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

		const { tier, limits } = await getOrgPlanLimits(orgId);
		const used = await countBillableUsers(orgId).catch(() => null);

		return NextResponse.json({
			tier,
			users: {
				used,
				limit: limits.maxUsers,
			},
		});
	} catch (error) {
		console.error("[SERVER] GET /api/users/plan-usage:", error);
		return NextResponse.json(
			{ error: "Failed to load plan usage" },
			{ status: 500 },
		);
	}
}
