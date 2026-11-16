import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { listScripts } from "@/lib/audit-lab/repository";
import { createScriptRow } from "@/lib/audit-lab/repository";
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
		const prior = await listScripts(resolved.actor.orgId, sessionId);
		const latest = prior[0];
		if (
			body.expectedVersion != null &&
			latest &&
			latest.version !== body.expectedVersion
		) {
			return NextResponse.json(
				{
					error:
						"Someone else saved this script first. Refresh and merge your changes.",
					conflict: true,
					currentVersion: latest.version,
				},
				{ status: 409 },
			);
		}
		const version = (latest?.version ?? 0) + 1;
		const script = await createScriptRow({
			orgId: resolved.actor.orgId,
			sessionId,
			version,
			itemsJson: body.itemsJson ?? latest?.itemsJson ?? "[]",
			createdByUserId: resolved.actor.userId,
		});
		return NextResponse.json({ data: script });
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