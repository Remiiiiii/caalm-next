export type AuditLabSurface =
	| "overview"
	| "simulations"
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
	simulations: {
		title: "Simulations",
		description: "Schedule and manage mock-audit simulations.",
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
		description: "Simulation outcomes and department readiness summaries.",
	},
};
