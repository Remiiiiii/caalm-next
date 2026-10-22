import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { generateDraft } from "@/lib/proposals/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireProposalOrgContext(
		request,
		[PERMISSIONS.PROPOSALS.GENERATE, PERMISSIONS.AI.DOCUMENT_ANALYSIS],
		{ requireAll: true },
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;
	try {
		const sections = await generateDraft({
			proposalId: id,
			orgId: ctx.orgId,
			userId: ctx.user.$id,
			userName: actorName(ctx.user),
			userEmail: ctx.user.email || "",
		});
		return NextResponse.json({ sections });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to generate draft";
		const status = message.includes("not found")
			? 404
			: message.includes("Certify") || message.includes("Shred")
				? 400
				: 500;
		console.error("[SERVER] POST /api/proposals/[id]/draft:", error);
		return NextResponse.json({ error: message }, { status });
	}
}
