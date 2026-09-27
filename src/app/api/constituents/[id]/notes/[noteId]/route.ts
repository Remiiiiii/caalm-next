import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteNote,
	getConstituentById,
	getNoteById,
	logConstituentAudit,
	requireConstituentOrgContext,
} from "@/lib/constituents";

type RouteContext = { params: Promise<{ id: string; noteId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id, noteId } = await context.params;
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	const note = await getNoteById(noteId);
	if (!note || note.orgId !== ctx.orgId || note.constituentId !== id) {
		return NextResponse.json({ error: "Note not found" }, { status: 404 });
	}

	try {
		await deleteNote(noteId);
		await logConstituentAudit({
			action: "delete",
			actor: {
				userId: ctx.user.$id,
				userName: ctx.user.fullName || ctx.user.email || "",
				userEmail: ctx.user.email || "",
			},
			orgId: ctx.orgId,
			targetId: id,
			targetLabel: `${existing.firstName} ${existing.lastName}`.trim(),
			summary: `Deleted timeline ${note.kind} ${noteId}`,
			metadata: { noteId, kind: note.kind },
		});
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[SERVER] constituent note DELETE:", error);
		return NextResponse.json(
			{ error: "Failed to delete note" },
			{ status: 500 },
		);
	}
}
