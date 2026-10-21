import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listRequirements } from "@/lib/proposals/repository";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { loadProposalWorkspace, saveRequirementEdits } from "@/lib/proposals/service";
import { isRequirementStatus, isResponseType } from "@/lib/proposals/types";

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
		const requirements = await listRequirements(ctx.orgId, id);
		return NextResponse.json({ requirements });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to load requirements";
		const status = message.includes("not found") ? 404 : 500;
		console.error("[SERVER] GET /api/proposals/[id]/requirements:", error);
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
		const body = (await request.json().catch(() => ({}))) as {
			updates?: Array<Record<string, unknown>>;
		};
		if (!Array.isArray(body.updates)) {
			return NextResponse.json(
				{ error: "updates must be an array" },
				{ status: 400 },
			);
		}
		const requirements = await saveRequirementEdits({
			proposalId: id,
			orgId: ctx.orgId,
			userId: ctx.user.$id,
			userName: actorName(ctx.user),
			userEmail: ctx.user.email || "",
			updates: body.updates
				.filter((row) => typeof row.id === "string")
				.map((row) => ({
					id: String(row.id),
					responseType: isResponseType(row.responseType)
						? row.responseType
						: undefined,
					status: isRequirementStatus(row.status) ? row.status : undefined,
					owner: row.owner ? String(row.owner) : undefined,
					requirementText: row.requirementText
						? String(row.requirementText)
						: undefined,
				})),
		});
		return NextResponse.json({ requirements });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to save requirements";
		const status = message.includes("not found") ? 404 : 500;
		console.error("[SERVER] PUT /api/proposals/[id]/requirements:", error);
		return NextResponse.json({ error: message }, { status });
	}
}
