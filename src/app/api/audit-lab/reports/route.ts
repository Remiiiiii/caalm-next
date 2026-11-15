import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import {
	departmentReadinessSummary,
	findRehearsalGaps,
	sessionReadinessReport,
} from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

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
		const { searchParams } = new URL(request.url);
		const kind = searchParams.get("kind") ?? "department";
		const sessionId = searchParams.get("sessionId") ?? undefined;
		if (kind === "gaps") {
			const gaps = await findRehearsalGaps(resolved.actor.orgId, sessionId);
			return NextResponse.json({ data: { gaps } });
		}
		if (kind === "session" && sessionId) {
			const result = await sessionReadinessReport(resolved.actor, sessionId);
			if ("error" in result && result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		const summary = await departmentReadinessSummary(resolved.actor.orgId);
		return NextResponse.json({ data: summary });
	} catch (error) {
		console.error("[SERVER] GET /api/audit-lab/reports:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't load that report. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
