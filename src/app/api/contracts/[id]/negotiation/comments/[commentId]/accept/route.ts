import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { acceptNegotiationRedline } from "@/lib/contracts/negotiation/accept-redline.service";
import {
	getComment,
	updateComment,
} from "@/lib/contracts/negotiation/comments.service";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

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
	const { id, commentId } = await context.params;
	try {
		await loadContractForOrg(id, orgId);
		const comment = await getComment(commentId);
		if (!comment || comment.contractId !== id) {
			return NextResponse.json({ error: "Comment not found" }, { status: 404 });
		}
		const nextVersion = await acceptNegotiationRedline({
			contractId: id,
			orgId,
			userId: user.$id,
			comment,
		});
		await updateComment(commentId, { status: "resolved" });
		return NextResponse.json({ version: nextVersion });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to accept redline";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
