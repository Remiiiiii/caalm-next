export type AuditLabSurface =
	| "overview"
	| "sessions"
	| "interview"
	| "practice"
	| "evidence"
	| "reports";

export const SURFACE_COPY: Record<
	AuditLabSurface,
	{ title: string; description: string }
> = {
	overview: {
		title: "Overview",
		description:
			"Mock audit rehearsal, interview building, and evidence readiness in one place.",
	},
	sessions: {
		title: "Sessions",
		description: "Schedule and manage mock-audit sessions.",
	},
	interview: {
		title: "Interview Builder",
		description: "Question bank and timed scripts for facilitators.",
	},
	practice: {
		title: "Practice & Roleplay",
		description: "Solo drills and live rehearsal against an auditor persona.",
	},
	evidence: {
		title: "Evidence Matrix",
		description: "PBC-style requests with owners, due dates, and status.",
	},
	reports: {
		title: "Reports",
		description: "Session outcomes and department readiness summaries.",
	},
};
