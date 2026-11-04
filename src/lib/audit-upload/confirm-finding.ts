import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { inferRootCause, slaDueAt } from "@/lib/audit-upload/caps";
import {
	createCap,
	getFinding,
	listCaps,
	updateFinding,
} from "@/lib/audit-upload/store";
import {
	CAP_GENERATING_VERDICTS,
	type AuditCapRecord,
	type AuditFindingRecord,
} from "@/lib/audit-upload/types";

export type ConfirmFindingActor = {
	$id: string;
	fullName?: string;
	name?: string;
	email?: string;
};

export type ConfirmFindingResult =
	| {
			ok: true;
			finding: AuditFindingRecord;
			cap: AuditCapRecord | null;
			draftedCap: boolean;
	  }
	| { ok: false; error: string; status: 400 | 404 };

/**
 * Confirm a draft finding and optionally draft an Open CAP (same rules as the findings API).
 */
export async function confirmAuditFinding(params: {
	orgId: string;
	user: ConfirmFindingActor;
	findingId: string;
}): Promise<ConfirmFindingResult> {
	const finding = await getFinding(params.orgId, params.findingId);
	if (!finding) {
		return { ok: false, error: "Finding not found.", status: 404 };
	}
	if (finding.status !== "draft") {
		return {
			ok: false,
			error: "Only draft findings can be confirmed.",
			status: 400,
		};
	}
	if (!finding.citationCheckPassed) {
		return {
			ok: false,
			error:
				"Quarantined findings cannot be confirmed until the quote is fixed.",
			status: 400,
		};
	}

	const updated = await updateFinding(params.findingId, {
		status: "confirmed",
	});
	let cap: AuditCapRecord | null = null;
	let draftedCap = false;

	const verdict = finding.reconciliation?.verdict;
	if (verdict && CAP_GENERATING_VERDICTS.includes(verdict)) {
		const existing = await listCaps({
			orgId: params.orgId,
			documentId: finding.documentId,
		});
		const already = existing.find((row) => row.findingId === finding.$id);
		if (already) {
			cap = already;
		} else {
			cap = await createCap({
				orgId: params.orgId,
				documentId: finding.documentId,
				findingId: finding.$id,
				title: `Correct: ${finding.title}`,
				rootCause: inferRootCause(`${finding.title} ${finding.description}`),
				assigneeId: null,
				status: "open",
				dueAt: slaDueAt(finding.severityComputed),
				escalationTier: 0,
				verificationEvidence: null,
				evidenceAttachments: [],
				closedAt: null,
			});
			draftedCap = true;
		}
	}

	await logAuditUploadEvent({
		user: params.user,
		orgId: params.orgId,
		action: "update",
		summary: `Confirmed finding ${finding.title}`,
		targetId: params.findingId,
		targetLabel: finding.title,
		targetType: "audit_finding",
	});

	return { ok: true, finding: updated, cap, draftedCap };
}
