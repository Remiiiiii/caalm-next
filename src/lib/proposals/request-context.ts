import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { PermissionKey } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { authorize } from "@/lib/rbac/authorize";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type ProposalOrgContext =
	| { ok: false; response: NextResponse }
	| { ok: true; user: AppUser; orgId: string };

export async function requireProposalOrgContext(
	request: NextRequest,
	permission: PermissionKey | PermissionKey[],
	options?: { requireAll?: boolean },
): Promise<ProposalOrgContext> {
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
		requireAll: options?.requireAll,
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

export function actorName(user: AppUser): string {
	return (
		(user as { fullName?: string }).fullName ||
		user.name ||
		user.email ||
		"unknown"
	);
}
