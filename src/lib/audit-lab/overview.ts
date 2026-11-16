import type { LabScope } from "@/lib/audit-lab/access";
import { sessionInScope } from "@/lib/audit-lab/access";
import {
	listEvidence,
	listGaps,
	listReports,
	listSessions,
} from "@/lib/audit-lab/repository";
import type { ReviewSession, SessionParticipant } from "@/lib/audit-lab/types";
import { listFindings } from "@/lib/audit-upload/store";

export type OverviewSuggestion = {
	id: string;
	title: string;
	reason: string;
	department: string;
	tag: string;
	tagTone: "danger" | "warning" | "info";
};

export type OverviewActivity = {
	id: string;
	/** Bold spans are wrapped in `**...**`. */
	text: string;
	timestamp: string;
	tone: "success" | "warning" | "danger" | "info";
};

function mockParticipants(names: string[]): string {
	const participants: SessionParticipant[] = names.map((name, index) => ({
		userId: `mock-${index}`,
		name,
		role: index === 0 ? "facilitator" : "observer",
	}));
	return JSON.stringify(participants);
}

/** Demo content shown only when an org has no real review activity yet. */
function mockOverview(orgId: string) {
	const suggestions: OverviewSuggestion[] = [
		{
			id: "mock-suggestion-1",
			title: "IT: Access Review (CC6.1)",
			reason: "Due for re-audit within 12 months",
			department: "IT",
			tag: "Prior critical finding",
			tagTone: "danger",
		},
		{
			id: "mock-suggestion-2",
			title: "Finance: Vendor Onboarding",
			reason: "Longest-unreviewed control in scope",
			department: "Finance",
			tag: "Stale · 14 months",
			tagTone: "warning",
		},
		{
			id: "mock-suggestion-3",
			title: "HR: Offboarding Checklist",
			reason: "One owner, no backup on file",
			department: "HR",
			tag: "Single-person dependency",
			tagTone: "info",
		},
	];

	const upcoming: ReviewSession[] = [
		{
			$id: "mock-session-1",
			orgId,
			title: "SOC 2: Finance Walkthrough",
			department: "Finance",
			framework: "CC6, CC7",
			scheduledAt: "Nov 18, 10:00 AM",
			durationMinutes: 60,
			status: "prep",
			participantsJson: mockParticipants([
				"Priya R.",
				"Micah I.",
				"Jordan K.",
				"Alex T.",
				"Sam W.",
			]),
			createdByUserId: "mock",
		},
		{
			$id: "mock-session-2",
			orgId,
			title: "ISO 27001: IT Access Review",
			department: "IT",
			framework: "A.9",
			scheduledAt: "Nov 21, 2:00 PM",
			durationMinutes: 60,
			status: "scheduled",
			participantsJson: mockParticipants(["Vera R.", "Jo O."]),
			createdByUserId: "mock",
		},
		{
			$id: "mock-session-3",
			orgId,
			title: "Quarterly Drill: HR",
			department: "HR",
			framework: "Offboarding",
			scheduledAt: "Dec 2, 9:00 AM",
			durationMinutes: 60,
			status: "draft",
			participantsJson: mockParticipants(["Taylor L."]),
			createdByUserId: "mock",
		},
		{
			$id: "mock-session-4",
			orgId,
			title: "PCI DSS: Payment Processing Review",
			department: "Finance",
			framework: "Req 10, 11",
			scheduledAt: "Dec 5, 1:00 PM",
			durationMinutes: 60,
			status: "scheduled",
			participantsJson: mockParticipants(["Dana K.", "Sam P."]),
			createdByUserId: "mock",
		},
		{
			$id: "mock-session-5",
			orgId,
			title: "HIPAA: Data Access Controls",
			department: "IT",
			framework: "164.312",
			scheduledAt: "Dec 9, 11:00 AM",
			durationMinutes: 60,
			status: "draft",
			participantsJson: mockParticipants(["Noah B."]),
			createdByUserId: "mock",
		},
		{
			$id: "mock-session-6",
			orgId,
			title: "GDPR: Vendor Data Processing",
			department: "Legal",
			framework: "Art. 28",
			scheduledAt: "Dec 12, 3:30 PM",
			durationMinutes: 60,
			status: "prep",
			participantsJson: mockParticipants([
				"Elena M.",
				"Chris D.",
				"Pat R.",
				"Lee S.",
			]),
			createdByUserId: "mock",
		},
		{
			$id: "mock-session-7",
			orgId,
			title: "NIST 800-53: Access Control Family",
			department: "IT",
			framework: "AC-2, AC-6",
			scheduledAt: "Dec 16, 9:30 AM",
			durationMinutes: 60,
			status: "scheduled",
			participantsJson: mockParticipants(["Grace H."]),
			createdByUserId: "mock",
		},
	];

	const activity: OverviewActivity[] = [
		{
			id: "mock-activity-1",
			text: "Evidence **SOC2-EV-014** accepted for Finance",
			timestamp: "12 minutes ago",
			tone: "success",
		},
		{
			id: "mock-activity-2",
			text: "Gap captured in **IT Access Review** practice round",
			timestamp: "1 hour ago",
			tone: "warning",
		},
		{
			id: "mock-activity-3",
			text: "**Vendor Risk Log** overdue, escalated to manager",
			timestamp: "3 hours ago",
			tone: "danger",
		},
		{
			id: "mock-activity-4",
			text: "Session **Q3 Drill: Finance** report published",
			timestamp: "Yesterday",
			tone: "info",
		},
	];

	return {
		stats: {
			readinessScore: 78,
			readinessTrend: 4,
			openGaps: 12,
			openGapsTrendLabel: "-3 this week",
			evidenceCoverage: 64,
			sessionsThisQuarter: 5,
		},
		suggestions,
		upcoming,
		activity,
	};
}

function monthsSince(iso?: string): number {
	if (!iso) return 0;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return 0;
	const now = new Date();
	const months =
		(now.getUTCFullYear() - d.getUTCFullYear()) * 12 +
		(now.getUTCMonth() - d.getUTCMonth());
	return Math.max(0, months);
}

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

	// First suggestion reads as a prior critical finding; the next two rotate
	// through the other rehearsal-risk tags so the row isn't all one color.
	const SUGGESTION_TAGS: Array<{
		tag: (f: (typeof findings)[number]) => string;
		tagTone: OverviewSuggestion["tagTone"];
	}> = [
		{ tag: () => "Prior critical finding", tagTone: "danger" },
		{
			tag: (f) => `Stale · ${monthsSince(f.$createdAt)} months`,
			tagTone: "warning",
		},
		{ tag: () => "Single-person dependency", tagTone: "info" },
	];

	const suggestions: OverviewSuggestion[] = findings
		.slice(0, 3)
		.map((f, index) => {
			const { tag, tagTone } = SUGGESTION_TAGS[index] ?? SUGGESTION_TAGS[0];
			return {
				id: f.$id,
				title: f.title || f.description || "Prior finding",
				reason: "Prior finding due for rehearsal",
				department: scopedSessions[0]?.department ?? "General",
				tag: tag(f),
				tagTone,
			};
		});

	const upcoming = [...scopedSessions]
		.filter((s) => s.status !== "cancelled" && s.status !== "archived")
		.sort((a, b) =>
			String(a.scheduledAt ?? "").localeCompare(String(b.scheduledAt ?? "")),
		)
		.slice(0, 5);

	// shortcut: no activity-log table is wired into audit-lab yet, so the demo
	// feed below is static. Swap for a real feed once one exists.
	const mock = mockOverview(orgId);
	// Stats fall back to the demo numbers only while the real numbers are all
	// still zero. Once any one of them is genuinely non-zero, real data wins.
	const statsAreEmpty =
		evidenceCoverage === 0 && openGaps === 0 && sessionsThisQuarter === 0;

	return {
		stats: statsAreEmpty
			? mock.stats
			: {
					readinessScore: evidenceCoverage,
					openGaps,
					evidenceCoverage,
					sessionsThisQuarter,
				},
		suggestions: suggestions.length > 0 ? suggestions : mock.suggestions,
		// Real sessions lead the list; demo sessions pad it out so the section
		// still reads as a full calendar instead of stopping at one real entry.
		upcoming: [...upcoming, ...mock.upcoming].slice(0, 7),
		activity: mock.activity,
		sessions: scopedSessions,
		evidence: scopedEvidence,
		gaps: scopedGaps,
		reports,
	};
}
