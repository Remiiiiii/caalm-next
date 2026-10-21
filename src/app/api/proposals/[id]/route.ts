import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireProposalOrgContext } from "@/lib/proposals/request-context";
import { loadProposalWorkspace } from "@/lib/proposals/service";
import { isProposalStatus } from "@/lib/proposals/types";
import { updateProposal } from "@/lib/proposals/repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;
	try {
		const workspace = await loadProposalWorkspace(id, ctx.orgId);
		return NextResponse.json(workspace);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to load proposal";
		const status = message.includes("not found") ? 404 : 500;
		console.error("[SERVER] GET /api/proposals/[id]:", error);
		return NextResponse.json({ error: message }, { status });
	}
}

export async function PUT(request: NextRequest, context: RouteContext) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.EDIT,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;
	try {
		const workspace = await loadProposalWorkspace(id, ctx.orgId);
		const body = (await request.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		const proposal = await updateProposal(workspace.proposal.$id, {
			title: body.title ? String(body.title) : undefined,
			status: isProposalStatus(body.status) ? body.status : undefined,
			corpus: body.corpus ? String(body.corpus) : undefined,
		});
		return NextResponse.json({ proposal });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update proposal";
		const status = message.includes("not found") ? 404 : 500;
		console.error("[SERVER] PUT /api/proposals/[id]:", error);
		return NextResponse.json({ error: message }, { status });
	}
}
