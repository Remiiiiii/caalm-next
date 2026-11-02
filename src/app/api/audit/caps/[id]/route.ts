import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { requiresCloseEvidence } from "@/lib/audit-upload/caps";
import { getAuditActor } from "@/lib/audit-upload/context";
import { getCap, getFinding, updateCap } from "@/lib/audit-upload/store";
import type { AuditCapStatus } from "@/lib/audit-upload/types";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.MANAGE_CAPS,
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const { id } = await context.params;
	const cap = await getCap(actor.orgId, id);
	if (!cap) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = (await request.json()) as {
		assigneeId?: string | null;
		status?: AuditCapStatus;
		verificationEvidence?: string;
		rootCause?: string;
	};

	if (body.status === "closed" || body.status === "verified") {
		const finding = await getFinding(actor.orgId, cap.findingId);
		const evidence = body.verificationEvidence ?? cap.verificationEvidence;
		if (
			finding &&
			requiresCloseEvidence(finding.severityComputed) &&
			!evidence?.trim()
		) {
			return NextResponse.json(
				{
					error:
						"Critical and high security findings need verification notes before close.",
				},
				{ status: 400 },
			);
		}
	}

	const updated = await updateCap(id, {
		assigneeId: body.assigneeId === undefined ? cap.assigneeId : body.assigneeId,
		status: body.status,
		verificationEvidence: body.verificationEvidence,
		rootCause: body.rootCause,
		closedAt:
			body.status === "closed" || body.status === "verified"
				? new Date().toISOString()
				: cap.closedAt,
	});

	await logAuditUploadEvent({
		user: actor.user,
		orgId: actor.orgId,
		action: "update",
		summary: `Updated corrective action ${cap.title}`,
		targetId: id,
		targetLabel: cap.title,
		targetType: "audit_cap",
	});

	return NextResponse.json({ success: true, data: { cap: updated } });
}
