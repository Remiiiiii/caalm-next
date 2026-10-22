import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listLibrary } from "@/lib/proposals/repository";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { saveLibraryEntry } from "@/lib/proposals/service";
import { isLibraryKind } from "@/lib/proposals/types";

export async function GET(request: NextRequest) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const items = await listLibrary(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[SERVER] GET /api/proposal-library:", error);
		return NextResponse.json(
			{ error: "Failed to load library" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.LIBRARY_MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const body = (await request.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		const title = String(body.title || "").trim();
		const bodyMarkdown = String(body.bodyMarkdown || "").trim();
		if (!title || !bodyMarkdown) {
			return NextResponse.json(
				{ error: "title and bodyMarkdown are required" },
				{ status: 400 },
			);
		}
		if (!isLibraryKind(body.kind)) {
			return NextResponse.json({ error: "kind is invalid" }, { status: 400 });
		}
		const entry = await saveLibraryEntry({
			orgId: ctx.orgId,
			userId: ctx.user.$id,
			userName: actorName(ctx.user),
			userEmail: ctx.user.email || "",
			kind: body.kind,
			title,
			bodyMarkdown,
			tags: Array.isArray(body.tags)
				? body.tags.filter((tag): tag is string => typeof tag === "string")
				: undefined,
		});
		return NextResponse.json({ entry }, { status: 201 });
	} catch (error) {
		console.error("[SERVER] POST /api/proposal-library:", error);
		return NextResponse.json(
			{ error: "Failed to save library item" },
			{ status: 500 },
		);
	}
}
