import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	rebuildNegotiationSnapshot,
	sendForReview,
	startNegotiation,
} from "@/lib/contracts/negotiation/lifecycle.service";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getUserPermissions } from "@/lib/rbac/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
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
	const { id } = await context.params;
	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const action = String(body.action || "");
	try {
		if (action === "start") {
			const result = await startNegotiation({
				contractId: id,
				orgId,
				userId: user.$id,
				extractedText:
					typeof body.extractedText === "string"
						? body.extractedText
						: undefined,
			});
			return NextResponse.json(result);
		}
		if (action === "rebuild_snapshot") {
			const result = await rebuildNegotiationSnapshot({
				contractId: id,
				orgId,
				userId: user.$id,
			});
			return NextResponse.json(result);
		}
		if (action === "send_for_review") {
			const permissions = await getUserPermissions(user.$id, orgId);
			const result = await sendForReview({
				contractId: id,
				orgId,
				permissions,
			});
			return NextResponse.json(result);
		}
		return NextResponse.json({ error: "Unknown action" }, { status: 400 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Lifecycle update failed";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
