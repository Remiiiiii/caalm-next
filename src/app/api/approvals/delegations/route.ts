import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createDelegation,
	listDelegationsForUser,
} from "@/lib/approvals/approvalDelegations";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.REVIEW, PERMISSIONS.LICENSES.REVIEW],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	const orgId = getOrgIdFromRequest(request);
	if (!user || !orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const userId = user.accountId || user.$id;
	const delegations = await listDelegationsForUser(orgId, userId);
	return NextResponse.json({ success: true, delegations });
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.REVIEW, PERMISSIONS.LICENSES.REVIEW],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	const orgId = getOrgIdFromRequest(request);
	if (!user || !orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const body = (await request.json()) as Record<string, unknown>;
	const delegateUserId = String(body.delegateUserId || "").trim();
	if (!delegateUserId) {
		return NextResponse.json(
			{ success: false, message: "Delegate is required" },
			{ status: 400 },
		);
	}

	const delegation = await createDelegation({
		orgId,
		userId: user.accountId || user.$id,
		delegateUserId,
		entityType: (body.entityType as "contract" | "license" | "both") || "both",
		startsAt: String(body.startsAt || new Date().toISOString()),
		endsAt: String(
			body.endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		),
	});

	return NextResponse.json({ success: true, delegation });
}
