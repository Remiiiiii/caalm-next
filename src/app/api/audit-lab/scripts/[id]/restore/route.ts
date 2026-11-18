import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { restoreScriptVersion } from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS,
	});
	if (denied) return denied;

	const { id: sessionId } = await context.params;
	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	try {
		const body = (await request.json()) as { version?: number };
		const result = await restoreScriptVersion(
			resolved.actor,
			sessionId,
			Number(body.version),
		);
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result.script });
	} catch (error) {
		console.error("[SERVER] POST /api/audit-lab/scripts/[id]/restore", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't restore that version. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
