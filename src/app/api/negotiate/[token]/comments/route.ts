import { type NextRequest, NextResponse } from "next/server";
import { resolveAccessByToken } from "@/lib/contracts/negotiation/access.service";
import { assertRedlineAnchorAllowed } from "@/lib/contracts/negotiation/comments.logic";
import { createComment } from "@/lib/contracts/negotiation/comments.service";
import { resolveNegotiateSession } from "@/lib/contracts/negotiation/session.service";
import { listVersions } from "@/lib/contracts/negotiation/versions.service";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const { token } = await context.params;
	const access = await resolveAccessByToken(token);
	if (!access) {
		return NextResponse.json(
			{ error: "Link expired or invalid" },
			{ status: 401 },
		);
	}

	const session = resolveNegotiateSession(request, access);
	if (!session) {
		return NextResponse.json(
			{ error: "Verify your email before commenting" },
			{ status: 401 },
		);
	}

	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const versions = await listVersions(access.contractId);
	const latest = versions[0];
	if (!latest) {
		return NextResponse.json(
			{ error: "No draft text to comment on" },
			{ status: 400 },
		);
	}
	try {
		const redlineProposal = String(body.redlineProposal || "");
		if (redlineProposal.trim()) {
			assertRedlineAnchorAllowed(
				latest.extractedText,
				Number(body.anchorStart || 0),
				Number(body.anchorEnd || 0),
			);
		}
		// Author identity always comes from the verified session, never the body.
		const comment = await createComment({
			contractId: access.contractId,
			orgId: access.orgId,
			versionId: latest.$id,
			body: String(body.body || ""),
			anchorType: body.anchorType === "selection" ? "selection" : "paragraph",
			anchorStart: Number(body.anchorStart || 0),
			anchorEnd: Number(body.anchorEnd || 0),
			authorType: "counterparty",
			authorEmail: session.invitee.email,
			authorName: session.invitee.name,
			redlineProposal,
		});
		return NextResponse.json({ comment });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to add comment";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
