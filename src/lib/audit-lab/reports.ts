import {
	listEvidence,
	listGaps,
	listSessions,
} from "@/lib/audit-lab/repository";
import { createReportRow } from "@/lib/audit-lab/repository";

type Actor = { userId: string; orgId: string };

export async function buildSessionReport(actor: Actor, sessionId: string) {
	const gaps = await listGaps(actor.orgId, sessionId);
	const evidence = await listEvidence(actor.orgId, sessionId);
	const accepted = evidence.filter((e) => e.status === "accepted").length;
	const body = {
		sessionId,
		gapCount: gaps.length,
		gaps: gaps.slice(0, 50),
		evidenceAccepted: accepted,
		evidenceTotal: evidence.length,
		suggestedActions: gaps.slice(0, 3).map((g) => ({
			gapId: g.$id,
			summary: g.description,
			nextStep: "Create a CAP or readiness update",
		})),
	};

	const report = await createReportRow({
		orgId: actor.orgId,
		sessionId,
		kind: "session",
		bodyJson: JSON.stringify(body),
		createdByUserId: actor.userId,
	});
	return { report, body };
}

export async function departmentTrendSummary(orgId: string) {
	const sessions = await listSessions(orgId, 100);
	const evidence = await listEvidence(orgId);
	const byDept: Record<string, { sessions: number; accepted: number; total: number }> =
		{};
	for (const session of sessions) {
		const dept = session.department || "Unassigned";
		byDept[dept] ??= { sessions: 0, accepted: 0, total: 0 };
		byDept[dept].sessions += 1;
	}
	for (const item of evidence) {
		const dept = item.department || "Unassigned";
		byDept[dept] ??= { sessions: 0, accepted: 0, total: 0 };
		byDept[dept].total += 1;
		if (item.status === "accepted") byDept[dept].accepted += 1;
	}
	return { byDepartment: byDept };
}