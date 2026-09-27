import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getConstituentById,
	requireConstituentOrgContext,
} from "@/lib/constituents";
import {
	markStewardshipContacted,
	StewardshipQueueError,
} from "@/lib/stewardship";

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	let body: { constituentId?: string; noteBody?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const constituentId = String(body.constituentId || "").trim();
	if (!constituentId) {
		return NextResponse.json(
			{ error: "constituentId is required" },
			{ status: 400 },
		);
	}

	const constituent = await getConstituentById(constituentId);
	if (!constituent || constituent.orgId !== ctx.orgId || constituent.mergedIntoId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	try {
		await markStewardshipContacted({
			orgId: ctx.orgId,
			constituentId,
			authorUserId: ctx.user.$id,
			authorName: ctx.user.name || ctx.user.email || undefined,
			noteBody: body.noteBody,
		});
		return NextResponse.json({ ok: true });
	} catch (error) {
		if (error instanceof StewardshipQueueError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] stewardship contacted POST:", error);
		return NextResponse.json(
			{ error: "Failed to record stewardship contact" },
			{ status: 500 },
		);
	}
}
