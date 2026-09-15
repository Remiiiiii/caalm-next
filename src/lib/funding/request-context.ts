import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { PermissionKey } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { authorize } from "@/lib/rbac/authorize";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type FundingOrgContext =
	| { ok: false; response: NextResponse }
	| { ok: true; user: AppUser; orgId: string };

/**
 * Resolve org from request (query / x-org-id) or default, then authorize once.
 * Data handlers must use the returned orgId — not a separate default-org lookup.
 */
export async function requireFundingOrgContext(
	request: NextRequest,
	permission: PermissionKey,
): Promise<FundingOrgContext> {
	const user = await getCurrentUser();
	if (!user) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			),
		};
	}

	const orgId =
		getOrgIdFromRequest(request) ||
		(await getUserDefaultOrganization(user.$id))?.orgId;
	if (!orgId) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			),
		};
	}

	const decision = await authorize({
		userId: user.$id,
		orgId,
		permission,
	});
	if (!decision.allowed) {
		const status = decision.reason === "Authentication required" ? 401 : 403;
		return {
			ok: false,
			response: NextResponse.json(
				{ error: decision.reason || "Insufficient permissions" },
				{ status },
			),
		};
	}

	return { ok: true, user, orgId };
}
