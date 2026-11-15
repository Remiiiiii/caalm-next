import { listFindings } from "@/lib/audit-upload/store";
import type { LabScope } from "@/lib/audit-lab/access";
import { sessionInScope } from "@/lib/audit-lab/access";
import {
	listEvidence,
	listGaps,
	listReports,
	listSessions,
} from "@/lib/audit-lab/repository";
import type { ReviewSession } from "@/lib/audit-lab/types";

function inQuarter(iso?: string): boolean {
	if (!iso) return false;
	const d = new Date(iso);
	const now = new Date();
	return (
		d.getUTCFullYear() === now.getUTCFullYear() &&
		Math.floor(d.getUTCMonth() / 3) === Math.floor(now.getUTCMonth() / 3)
	);
}

function filterSessions(sessions: ReviewSession[], scope: LabScope) {
	return sessions.filter((s) => sessionInScope(s.department, scope));
}

export async function buildLabOverview(orgId: string, scope: LabScope) {
	const [sessions, evidence, gaps, reports, findings] = await Promise.all([
		listSessions(orgId, 100),
		listEvidence(orgId),
		listGaps(orgId),
		listReports(orgId),
		listFindings({ orgId, limit: 5 }).catch(() => []),
	]);

	const scopedSessions = filterSessions(sessions, scope);
	const scopedSessionIds = new Set(scopedSessions.map((s) => s.$id));
	const scopedEvidence = evidence.filter(
		(e) => !e.sessionId || scopedSessionIds.has(e.sessionId),
	);
	const scopedGaps = gaps.filter((g) => scopedSessionIds.has(g.sessionId));

	const accepted = scopedEvidence.filter((e) => e.status === "accepted").length;
	const evidenceCoverage =
		scopedEvidence.length === 0
			? 0
			: Math.round((accepted / scopedEvidence.length) * 100);

	const openGaps = scopedGaps.filter((g) => g.status !== "closed").length;
	const sessionsThisQuarter = scopedSessions.filter((s) =>
		inQuarter(s.scheduledAt),
	).length;

	const suggestions = findings.slice(0, 3).map((f) => ({
		id: f.$id,
		title: f.title || f.summary || "Prior finding",
		reason: "Prior finding due for rehearsal",
		department: scopedSessions[0]?.department ?? "General",
	}));

	const upcoming = [...scopedSessions]
		.filter((s) => s.status !== "cancelled" && s.status !== "archived")
		.sort((a, b) =>
			String(a.scheduledAt ?? "").localeCompare(String(b.scheduledAt ?? "")),
		)
		.slice(0, 5);

	return {
		stats: {
			readinessScore: evidenceCoverage,
			openGaps,
			evidenceCoverage,
			sessionsThisQuarter,
		},
		suggestions,
		upcoming,
		sessions: scopedSessions,
		evidence: scopedEvidence,
		gaps: scopedGaps,
		reports,
	};
}