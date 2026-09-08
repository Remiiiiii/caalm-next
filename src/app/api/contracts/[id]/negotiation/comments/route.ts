import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { assertRedlineAnchorAllowed } from "@/lib/contracts/negotiation/comments.logic";
import {
	createComment,
	listComments,
} from "@/lib/contracts/negotiation/comments.service";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { getVersion } from "@/lib/contracts/negotiation/versions.service";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.VIEW,
	});
	if (denied) return denied;
	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ error: "Organization is required" },
			{ status: 400 },
		);
	}
	const { id } = await context.params;
	try {
		await loadContractForOrg(id, orgId);
		const comments = await listComments(id);
		return NextResponse.json({ comments });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to list comments";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

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
	try {
		await loadContractForOrg(id, orgId);
		const versionId = String(body.versionId || "");
		const redlineProposal = String(body.redlineProposal || "");
		if (redlineProposal.trim()) {
			const version = await getVersion(versionId);
			if (!version || version.contractId !== id) {
				throw new Error("Version not found");
			}
			assertRedlineAnchorAllowed(
				version.extractedText,
				Number(body.anchorStart || 0),
				Number(body.anchorEnd || 0),
			);
		}
		const comment = await createComment({
			contractId: id,
			orgId,
			versionId,
			body: String(body.body || ""),
			anchorType: body.anchorType === "selection" ? "selection" : "paragraph",
			anchorStart: Number(body.anchorStart || 0),
			anchorEnd: Number(body.anchorEnd || 0),
			authorType: "internal",
			authorId: user.$id,
			authorEmail: user.email || "",
			authorName:
				String((user as { fullName?: string }).fullName || "").trim() ||
				undefined,
			redlineProposal,
			visibility: body.visibility === "internal" ? "internal" : "shared",
		});
		return NextResponse.json({ comment });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create comment";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
