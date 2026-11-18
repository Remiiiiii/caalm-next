import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import {
	assignSessionRole,
	cancelReviewSession,
	completeReviewSession,
	dismissAiBanner,
	inviteParticipants,
	rescheduleReviewSession,
	setSimulationPhase,
} from "@/lib/audit-lab/service";
import type { SessionRole } from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS,
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	const { id } = await context.params;
	try {
		const body = (await request.json()) as {
			action?: string;
			scheduledAt?: string;
			participants?: Array<{
				userId: string;
				name?: string;
				email?: string;
				role?: SessionRole;
			}>;
			userId?: string;
			role?: SessionRole;
			signature?: string;
		};
		const action = String(body.action ?? "reschedule");
		if (action === "dismiss_ai_banner") {
			const result = await dismissAiBanner(
				resolved.actor,
				id,
				String(body.signature ?? ""),
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result.session });
		}
		if (action === "reschedule") {
			const result = await rescheduleReviewSession(
				resolved.actor,
				id,
				String(body.scheduledAt ?? ""),
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result.session });
		}
		if (action === "cancel") {
			const result = await cancelReviewSession(resolved.actor, id);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result.session });
		}
		if (action === "complete") {
			const result = await completeReviewSession(resolved.actor, id);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result.session });
		}
		if (action === "invite") {
			const result = await inviteParticipants(
				resolved.actor,
				id,
				(body.participants ?? []).map((p) => ({
					...p,
					role: p.role ?? "interviewee",
				})),
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		if (action === "assign_role") {
			const result = await assignSessionRole(
				resolved.actor,
				id,
				String(body.userId ?? ""),
				(body.role ?? "interviewee") as SessionRole,
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		return NextResponse.json(
			{ error: `Unknown action "${action}".` },
			{
				status: 400,
			},
		);
	} catch (error) {
		console.error("[SERVER] PATCH /api/audit-lab/sessions/[id]:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't update that session. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
