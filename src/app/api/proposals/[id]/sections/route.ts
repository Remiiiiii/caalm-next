import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listSections } from "@/lib/proposals/repository";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { loadProposalWorkspace, saveSection } from "@/lib/proposals/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;
	try {
		await loadProposalWorkspace(id, ctx.orgId);
		const sections = await listSections(ctx.orgId, id);
		return NextResponse.json({ sections });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to load sections";
		const status = message.includes("not found") ? 404 : 500;
		console.error("[SERVER] GET /api/proposals/[id]/sections:", error);
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
		const body = (await request.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		if (typeof body.sectionId !== "string") {
			return NextResponse.json(
				{ error: "sectionId is required" },
				{ status: 400 },
			);
		}
		const section = await saveSection({
			proposalId: id,
			orgId: ctx.orgId,
			sectionId: body.sectionId,
			heading: body.heading ? String(body.heading) : undefined,
			bodyMarkdown:
				typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : undefined,
			userId: ctx.user.$id,
			userName: actorName(ctx.user),
		});
		return NextResponse.json({ section });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to save section";
		const status = message.includes("not found") ? 404 : 500;
		console.error("[SERVER] PUT /api/proposals/[id]/sections:", error);
		return NextResponse.json({ error: message }, { status });
	}
}
