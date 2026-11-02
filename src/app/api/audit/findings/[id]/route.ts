import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { CAP_GENERATING_VERDICTS } from "@/lib/audit-upload/types";
import { inferRootCause, slaDueAt } from "@/lib/audit-upload/caps";
import { getAuditActor } from "@/lib/audit-upload/context";
import {
	createCap,
	getFinding,
	listCaps,
	updateFinding,
} from "@/lib/audit-upload/store";
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
		if (!finding.citationCheckPassed) {
			return NextResponse.json(
				{ error: "Quarantined findings cannot be confirmed until the quote is fixed." },
				{ status: 400 },
			);
		}
		const updated = await updateFinding(id, { status: "confirmed" });
		const verdict = finding.reconciliation?.verdict;
		if (verdict && CAP_GENERATING_VERDICTS.includes(verdict)) {
			const existing = await listCaps({
				orgId: actor.orgId,
				documentId: finding.documentId,
			});
			const already = existing.some((cap) => cap.findingId === finding.$id);
			if (!already) {
				await createCap({
					orgId: actor.orgId,
					documentId: finding.documentId,
					findingId: finding.$id,
					title: `Correct: ${finding.title}`,
					rootCause: inferRootCause(`${finding.title} ${finding.description}`),
					assigneeId: null,
					status: "open",
					dueAt: slaDueAt(finding.severityComputed),
					escalationTier: 0,
					verificationEvidence: null,
					closedAt: null,
				});
			}
		}
		await logAuditUploadEvent({
			user: actor.user,
			orgId: actor.orgId,
			action: "update",
			summary: `Confirmed finding ${finding.title}`,
			targetId: id,
			targetLabel: finding.title,
			targetType: "audit_finding",
		});
		return NextResponse.json({ success: true, data: { finding: updated } });
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
