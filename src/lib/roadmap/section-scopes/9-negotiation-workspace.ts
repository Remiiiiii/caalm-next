/** Tracking scope for CLM roadmap section 7 (PR #62). Branch name is historical. */
export const SECTION_7_SCOPE = {
	sectionNumber: 7,
	title: "Negotiation & Authoring Workspace",
	decisionArtifact: "docs/adr/007-native-negotiation-workspace.md",
	tasks: [
		"7.1 Build-vs-partner decision",
		"7.2 Document versioning + diff",
		"7.3 Inline commenting/redlining",
		"7.4 Counterparty access",
		"7.5 Wire lifecycleStatus negotiation",
	],
} as const;

/** @deprecated Use SECTION_7_SCOPE. Kept so older imports keep resolving. */
export const SECTION_9_SCOPE = SECTION_7_SCOPE;
