import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { convertWonPursuitToProposal } from "@/lib/funding";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;

	try {
		const result = await convertWonPursuitToProposal({
			pursuitId: id,
			orgId: ctx.orgId,
			userId: ctx.user.$id,
		});
		return NextResponse.json(result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to convert pursuit";
		const status = message.includes("not found")
			? 404
			: message.includes("does not belong")
				? 403
				: 500;
		console.error("[funding/pursuits convert]", error);
		return NextResponse.json({ error: message }, { status });
	}
}
