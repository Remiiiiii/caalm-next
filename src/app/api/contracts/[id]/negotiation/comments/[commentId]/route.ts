import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getComment,
	updateComment,
} from "@/lib/contracts/negotiation/comments.service";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;
	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ error: "Organization is required" },
			{ status: 400 },
		);
	}
	const { id, commentId } = await context.params;
	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	try {
		await loadContractForOrg(id, orgId);
		const existing = await getComment(commentId);
		if (!existing || existing.contractId !== id) {
			return NextResponse.json({ error: "Comment not found" }, { status: 404 });
		}
		const comment = await updateComment(commentId, {
			status:
				body.status === "resolved" || body.status === "open"
					? body.status
					: undefined,
			redlineProposal:
				typeof body.redlineProposal === "string"
					? body.redlineProposal
					: undefined,
			body: typeof body.body === "string" ? body.body : undefined,
		});
		return NextResponse.json({ comment });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update comment";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
