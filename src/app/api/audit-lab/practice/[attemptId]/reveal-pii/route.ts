import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { auditPracticePiiReveal } from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ attemptId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.VIEW_PRACTICE_PII,
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
		const { attemptId } = await context.params;
		const result = await auditPracticePiiReveal(resolved.actor, attemptId);
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: { revealed: true } });
	} catch (error) {
		console.error(
			"[SERVER] POST /api/audit-lab/practice/[attemptId]/reveal-pii:",
			error,
		);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not reveal that transcript. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
