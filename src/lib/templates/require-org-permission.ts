import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { authorize } from "@/lib/rbac/authorize";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type OrgAuthResult =
	| { ok: false; response: NextResponse }
	| { ok: true; user: AppUser; orgId: string };

/** Org context after the route already called `requirePermission`. */
export async function resolveOrgContext(
	user?: AppUser | null,
): Promise<OrgAuthResult> {
	const resolvedUser = user ?? (await getCurrentUser());
	if (!resolvedUser) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			),
		};
	}
	const org = await getUserDefaultOrganization(resolvedUser.$id);
	if (!org?.orgId) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			),
		};
	}
	return { ok: true, user: resolvedUser, orgId: org.orgId };
}

/** Single auth hop for contract-create wizard routes (user + org + permission). */
export async function requireContractCreateContext(
	request: NextRequest,
): Promise<OrgAuthResult> {
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

	const orgIdParam = getOrgIdFromRequest(request);
	const orgId =
		orgIdParam || (await getUserDefaultOrganization(user.$id))?.orgId;
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
		permission: PERMISSIONS.CONTRACTS.CREATE,
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
