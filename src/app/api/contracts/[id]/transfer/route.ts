import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireStepUp } from "@/lib/auth/step-up";
import { transferContractOwnership } from "@/lib/ownership/transfer.service";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.VIEW_ALL, PERMISSIONS.CONTRACTS.EDIT],
		requireAll: true,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	const orgId = getOrgIdFromRequest(request);
	if (!user || !orgId) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const stepUpCheck = requireStepUp(request, user.$id);
	if (stepUpCheck) return stepUpCheck;

	const { id } = await context.params;
	const body = (await request.json().catch(() => ({}))) as {
		toUserId?: string;
	};
	const toUserId = String(body.toUserId || "").trim();
	if (!toUserId) {
		return NextResponse.json(
			{ error: "toUserId is required" },
			{ status: 400 },
		);
	}

	try {
		const result = await transferContractOwnership({
			contractId: id,
			orgId,
			toUserId,
			actorUserId: user.$id,
		});
		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to transfer ownership";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
