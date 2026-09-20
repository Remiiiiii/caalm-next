import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createNote,
	getConstituentById,
	isConstituentNoteKind,
	listNotesForConstituent,
	requireConstituentOrgContext,
} from "@/lib/constituents";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwned(id: string, orgId: string) {
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== orgId || existing.mergedIntoId) {
		return null;
	}
	return existing;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await loadOwned(id, ctx.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	const notes = await listNotesForConstituent(id, ctx.orgId);
	return NextResponse.json({ notes });
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await loadOwned(id, ctx.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const text = String(body.body || "").trim();
		if (!text) {
			return NextResponse.json({ error: "body is required" }, { status: 400 });
		}
		const kind = isConstituentNoteKind(body.kind) ? body.kind : "note";
		const note = await createNote({
			orgId: ctx.orgId,
			constituentId: id,
			kind,
			body: text,
			authorUserId: ctx.user.$id,
			authorName: ctx.user.fullName || ctx.user.email || "",
		});
		return NextResponse.json({ note }, { status: 201 });
	} catch (error) {
		console.error("[SERVER] constituent notes POST:", error);
		return NextResponse.json(
			{ error: "Failed to create note" },
			{ status: 500 },
		);
	}
}
