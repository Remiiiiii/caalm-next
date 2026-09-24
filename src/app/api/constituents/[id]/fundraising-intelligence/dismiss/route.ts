import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById, requireConstituentOrgContext } from "@/lib/constituents";
import { isNextBestActionKind } from "@/lib/fundraising/next-best-action-kinds";
import { dismissNextBestAction } from "@/lib/stewardship/nba-dismissals.repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.AI.FUNDRAISING,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	const constituent = await getConstituentById(id);
	if (!constituent || constituent.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	let body: { actionKind?: string; reason?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const actionKind = body.actionKind?.trim() ?? "";
	const reason = body.reason?.trim() ?? "";
	if (!isNextBestActionKind(actionKind)) {
		return NextResponse.json({ error: "Invalid actionKind" }, { status: 400 });
	}
	if (reason.length < 3) {
		return NextResponse.json({ error: "reason is required" }, { status: 400 });
	}

	try {
		const row = await dismissNextBestAction({
			orgId: ctx.orgId,
			constituentId: id,
			userId: ctx.user.$id,
			actionKind,
			reason,
		});
		return NextResponse.json({ ok: true, cooldownUntil: row.cooldownUntil });
	} catch (error) {
		console.error("[SERVER] fundraising-intelligence dismiss:", error);
		return NextResponse.json(
			{ error: "Failed to dismiss action" },
			{ status: 500 },
		);
	}
}
