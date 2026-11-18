import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { listScripts } from "@/lib/audit-lab/repository";
import { saveScriptDraft } from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.VIEW,
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
	const versions = await listScripts(resolved.actor.orgId, sessionId);
	return NextResponse.json({ data: { versions } });
}

export async function PATCH(
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
		const body = (await request.json()) as {
			itemsJson?: string;
			expectedVersion?: number;
		};
		const result = await saveScriptDraft(
			resolved.actor,
			sessionId,
			body.itemsJson ?? "[]",
			body.expectedVersion,
		);
		if (result.error) {
			return NextResponse.json(
				{
					error: result.error,
					conflict: result.conflict,
					currentVersion: result.currentVersion,
				},
				{ status: result.conflict ? 409 : 400 },
			);
		}
		return NextResponse.json({ data: result.script });
	} catch (error) {
		console.error("[SERVER] PATCH /api/audit-lab/scripts/[id]", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't save that script. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
