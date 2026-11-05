import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { confirmAuditFinding } from "@/lib/audit-upload/confirm-finding";
import { getAuditActor } from "@/lib/audit-upload/context";
import { getFinding, updateFinding } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.MANAGE_FINDINGS,
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const { id } = await context.params;
	const finding = await getFinding(actor.orgId, id);
	if (!finding) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = (await request.json()) as {
		action?: string;
		reason?: string;
	};

	if (body.action === "confirm") {
		const result = await confirmAuditFinding({
			orgId: actor.orgId,
			user: actor.user,
			findingId: id,
		});
		if (!result.ok) {
			return NextResponse.json(
				{ error: result.error },
				{ status: result.status },
			);
		}
		return NextResponse.json({
			success: true,
			data: { finding: result.finding, cap: result.cap },
		});
	}

	if (body.action === "dispute") {
		const updated = await updateFinding(id, {
			status: "disputed",
			disputeReason: body.reason?.trim() || "Disputed",
		});
		await logAuditUploadEvent({
			user: actor.user,
			orgId: actor.orgId,
			action: "update",
			summary: `Disputed finding ${finding.title}`,
			targetId: id,
			targetLabel: finding.title,
			targetType: "audit_finding",
		});
		return NextResponse.json({ success: true, data: { finding: updated } });
	}

	if (body.action === "rectify") {
		const updated = await updateFinding(id, { status: "rectified" });
		return NextResponse.json({ success: true, data: { finding: updated } });
	}

	if (body.action === "accept_risk") {
		if (!body.reason?.trim()) {
			return NextResponse.json(
				{ error: "A reason is required to accept this risk." },
				{ status: 400 },
			);
		}
		const updated = await updateFinding(id, {
			status: "accepted_risk",
			riskAcceptanceReason: body.reason.trim(),
			riskAcceptedBy: actor.user.$id,
			riskAcceptedAt: new Date().toISOString(),
		});
		await logAuditUploadEvent({
			user: actor.user,
			orgId: actor.orgId,
			action: "update",
			summary: `Accepted risk for ${finding.title}`,
			targetId: id,
			targetLabel: finding.title,
			targetType: "audit_finding",
		});
		return NextResponse.json({ success: true, data: { finding: updated } });
	}

	return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
