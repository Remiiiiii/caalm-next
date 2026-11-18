import type { ScriptSection } from "@/lib/audit-lab/script-sections";

/** CAALM badge classes (no dots, no truncate), per the global style guide's 5-color badge system. */
export const CAALM_BADGE_BASE =
	"inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold rounded-full border whitespace-nowrap";

export type QuestionSourceTag =
	| "finding"
	| "readiness_gap"
	| "template"
	| "manual";

export const SOURCE_TAG_LABEL: Record<QuestionSourceTag, string> = {
	finding: "From finding",
	readiness_gap: "Readiness gap",
	template: "Template",
	manual: "Manual",
};

/**
 * shortcut: no single-person/dependency detection exists anywhere in this codebase (no
 * signal for "how many people can attest to this control"), so `manual` renders neutral
 * instead of the spec's "single-person" dependency tint. Upgrade once a real signal exists.
 */
export const SOURCE_TAG_BADGE: Record<QuestionSourceTag, string> = {
	finding: "bg-red/10 text-red border-red/20",
	readiness_gap: "bg-orange/10 text-orange border-orange/20",
	template: "bg-slate-100 text-slate-600 border-slate-200",
	manual: "bg-slate-100 text-slate-600 border-slate-200",
};

export function normalizeSourceTag(source: string): QuestionSourceTag {
	if (
		source === "finding" ||
		source === "readiness_gap" ||
		source === "template"
	) {
		return source;
	}
	return "manual";
}

export const SECTION_LABELS: Record<ScriptSection, string> = {
	opening: "Opening",
	process: "Process walkthroughs",
	evidence: "Evidence requests",
	closing: "Closing",
};

export const SECTION_INFO: Record<
	ScriptSection,
	{ description: string; example: string }
> = {
	opening: {
		description:
			"The first few minutes — introductions, confirming what's in scope, and setting ground rules for the rest of the session.",
		example:
			'"Can you walk me through your role and how long you\'ve been responsible for this control?"',
	},
	process: {
		description:
			"Where you explain how a day-to-day process actually works in practice, step by step.",
		example:
			'"Walk me through what happens when a new employee needs system access."',
	},
	evidence: {
		description:
			"Questions that ask for proof — a record, log, or document showing the control actually happened.",
		example: '"Show me the approval record for the last access review."',
	},
	closing: {
		description:
			"Wrapping up — summarizing what was found, naming any gaps, and agreeing on next steps.",
		example:
			'"Is there anything we covered today you\'d like to revisit before we finish?"',
	},
};
