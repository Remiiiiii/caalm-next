import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getLibraryEntry } from "@/lib/proposals/repository";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { saveLibraryEntry } from "@/lib/proposals/service";
import { isLibraryKind } from "@/lib/proposals/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.LIBRARY_MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;
	try {
		const existing = await getLibraryEntry(id);
		if (!existing || existing.orgId !== ctx.orgId) {
			return NextResponse.json({ error: "Library item not found" }, { status: 404 });
		}
		const body = (await request.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		const entry = await saveLibraryEntry({
			orgId: ctx.orgId,
			userId: ctx.user.$id,
			userName: actorName(ctx.user),
			userEmail: ctx.user.email || "",
			entryId: id,
			kind: isLibraryKind(body.kind) ? body.kind : existing.kind,
			title: body.title ? String(body.title) : existing.title,
			bodyMarkdown: body.bodyMarkdown
				? String(body.bodyMarkdown)
				: existing.bodyMarkdown,
			tags: Array.isArray(body.tags)
				? body.tags.filter((tag): tag is string => typeof tag === "string")
				: existing.tags,
			approvedAt: body.approvedAt ? String(body.approvedAt) : existing.approvedAt,
			expiresAt: body.expiresAt ? String(body.expiresAt) : existing.expiresAt,
		});
		return NextResponse.json({ entry });
	} catch (error) {
		console.error("[SERVER] PUT /api/proposal-library/[id]:", error);
		return NextResponse.json(
			{ error: "Failed to update library item" },
			{ status: 500 },
		);
	}
}
