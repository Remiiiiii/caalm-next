import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { shredProposal } from "@/lib/proposals/service";

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
		const body = (await request.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		const requirements = await shredProposal({
			proposalId: id,
			orgId: ctx.orgId,
			userId: ctx.user.$id,
			userName: actorName(ctx.user),
			userEmail: ctx.user.email || "",
			corpus: body.corpus ? String(body.corpus) : undefined,
		});
		return NextResponse.json({ requirements });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to shred solicitation";
		const status = message.includes("not found")
			? 404
			: message.includes("required")
				? 400
				: 500;
		console.error("[SERVER] POST /api/proposals/[id]/shred:", error);
		return NextResponse.json({ error: message }, { status });
	}
}
