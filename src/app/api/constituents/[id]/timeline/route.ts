import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getConstituentById,
	listDerivedAgreements,
	listNotesForConstituent,
	requireConstituentOrgContext,
} from "@/lib/constituents";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== ctx.orgId || existing.mergedIntoId) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	try {
		const [notes, agreements] = await Promise.all([
			listNotesForConstituent(id, ctx.orgId),
			listDerivedAgreements(existing),
		]);
		return NextResponse.json({ notes, agreements });
	} catch (error) {
		console.error("[SERVER] constituent timeline GET:", error);
		return NextResponse.json(
			{ error: "Failed to load timeline" },
			{ status: 500 },
		);
	}
}
