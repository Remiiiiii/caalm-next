import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listProposals } from "@/lib/proposals/repository";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { createProposalForSolicitation } from "@/lib/proposals/service";

export async function GET(request: NextRequest) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const items = await listProposals(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[SERVER] GET /api/proposals:", error);
		return NextResponse.json(
			{ error: "Failed to list proposals" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.CREATE,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const body = (await request.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		const title = String(body.title || "").trim();
		if (!title) {
			return NextResponse.json({ error: "title is required" }, { status: 400 });
		}
		const proposal = await createProposalForSolicitation({
			orgId: ctx.orgId,
			title,
			solicitationRef: body.solicitationRef
				? String(body.solicitationRef)
				: undefined,
			corpus: body.corpus ? String(body.corpus) : undefined,
			linkedContractId: body.linkedContractId
				? String(body.linkedContractId)
				: undefined,
			linkedFundingPursuitId: body.linkedFundingPursuitId
				? String(body.linkedFundingPursuitId)
				: undefined,
			userId: ctx.user.$id,
			userName: actorName(ctx.user),
			userEmail: ctx.user.email || "",
		});
		return NextResponse.json({ proposal }, { status: 201 });
	} catch (error) {
		console.error("[SERVER] POST /api/proposals:", error);
		return NextResponse.json(
			{ error: "Failed to create proposal" },
			{ status: 500 },
		);
	}
}
