/**
 * Classify whether a finding correction can be finished as a CAALM data change
 * (review → Mark closed) or needs a named real-world step before close.
 */

export type CorrectionAutonomyResult =
	| { aiCompletable: true }
	| {
			aiCompletable: false;
			/** Specific outside-CAALM gate — shown in Show me how copy. */
			unmetReason: string;
	  };

type FailPattern = {
	id: string;
	/** Match against title + condition + how-to-correct (lowercased). */
	test: RegExp;
	unmetReason: string;
};

/** First matching pattern wins (most specific physical gates first). */
const FAIL_PATTERNS: FailPattern[] = [
	{
		id: "physical-equipment",
		test: /\b(physical\s+(count|inventory|reconcil)|equipment\s+(inventory|reconcil)|reconcil\w*\s+(of\s+)?(equipment|property|assets)|property\s+records?\s+to\s+equipment)\b/i,
		unmetReason:
			"evidence that the equipment was physically counted and reconciled",
	},
	{
		id: "physical-cash-asset",
		test: /\b(cash\s+reconcil|physical\s+asset|asset\s+count|count\s+cash)\b/i,
		unmetReason:
			"evidence of a real-world cash or physical asset count/reconciliation",
	},
	{
		id: "training",
		test: /\b(staff\s+training|training\s+complet|attend(ance|ed)\s+training|complete(d)?\s+training)\b/i,
		unmetReason:
			"evidence that the required staff training was completed",
	},
	{
		id: "signature",
		test: /\b(sign(ed|ature)|acknowledg(e|ed|ement)|wet\s+ink)\b/i,
		unmetReason:
			"evidence of a signature or acknowledgment outside CAALM",
	},
	{
		id: "external-patch",
		test: /\b(patch(ed|ing)?|reconfigur|external\s+system|vendor\s+system|firewall|server\s+update)\b/i,
		unmetReason:
			"proof that the external system was patched or reconfigured",
	},
	{
		id: "access-revoke",
		test: /\b(badge|key\s+card|access\s+(revok|remov|terminat)|physically\s+revok)\b/i,
		unmetReason:
			"evidence that access was physically revoked (badge, key, or equipment)",
	},
	{
		id: "generic-physical",
		test: /\b(physically\s+|on[- ]site\s+(count|visit|inspect)|walk[- ]through)\b/i,
		unmetReason:
			"evidence of a real-world physical action outside CAALM",
	},
];

export function classifyCorrectionAutonomy(params: {
	title?: string | null;
	conditionText?: string | null;
	correctiveText?: string | null;
}): CorrectionAutonomyResult {
	const haystack = [
		params.title ?? "",
		params.conditionText ?? "",
		params.correctiveText ?? "",
	]
		.join("\n")
		.toLowerCase();

	for (const pattern of FAIL_PATTERNS) {
		if (pattern.test.test(haystack)) {
			return { aiCompletable: false, unmetReason: pattern.unmetReason };
		}
	}
	return { aiCompletable: true };
}

/** Plain summary lead for AI-completable corrections. */
export function autonomyPassSummaryLead(): string {
	return "This is a data correction I can complete for you. Review the proposed change below, and once you confirm, I'll apply it and the finding can be marked closed.";
}

/** Plain summary lead when a real-world gate remains. */
export function autonomyFailSummaryLead(params: {
	canStartCap: boolean;
	unmetReason: string;
}): string {
	const canDo = params.canStartCap
		? "I can draft the corrective action and start it for you."
		: "I can help track this finding in CAALM.";
	return `${canDo} Closing this finding still requires ${params.unmetReason} — you'll need to upload documentation of that before it can be marked closed.`;
}
