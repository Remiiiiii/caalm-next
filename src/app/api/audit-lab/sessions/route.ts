import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveLabCapabilities } from "@/lib/audit-lab/access";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { buildLabOverview } from "@/lib/audit-lab/overview";
import { scheduleReviewSession } from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserPermissions } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.VIEW,
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	try {
		// Same builder the overview surface uses, so the Sessions table shows
		// the identical (real + demo) rows instead of a real-only subset.
		const { actor } = resolved;
		const permissions = await getUserPermissions(actor.userId, actor.orgId);
		const caps = resolveLabCapabilities({ permissions });
		const overview = await buildLabOverview(actor.orgId, caps.scope);
		return NextResponse.json({ data: overview });
	} catch (error) {
		console.error("[SERVER] GET /api/audit-lab/sessions:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't load Audit Lab sessions. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
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

	try {
		const body = (await request.json()) as {
			title?: string;
			department?: string;
			scheduledAt?: string;
			durationMinutes?: number;
			framework?: string;
		};
		const result = await scheduleReviewSession(resolved.actor, {
			title: body.title,
			department: String(body.department ?? ""),
			scheduledAt: body.scheduledAt,
			durationMinutes: body.durationMinutes,
			framework: body.framework,
		});
		if ("error" in result && result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result.session });
	} catch (error) {
		console.error("[SERVER] POST /api/audit-lab/sessions:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't schedule that review. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
