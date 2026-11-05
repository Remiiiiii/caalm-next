import { loadReadinessItems } from "./readiness-adapter";
import { getAuditDocument, listCaps, listFindings } from "./store";
import type {
	AuditFindingRecord,
	ControlDeficiencyType,
	ReadinessItem,
} from "./types";

export type AuditReportSignalType =
	| "contradicts_evidence"
	| "severity_mismatch"
	| "quarantined"
	| "disputed"
	| "blind_spots"
	| "repeat"
	| "predicted";

export type AuditReportSignal = {
	type: AuditReportSignalType;
	count: number;
	findingIds: string[];
	/** Type-specific payload the UI uses to write the description — see each builder below. */
	detail: Record<string, unknown>[];
};

export type AuditReportReconVerdict =
	| "predicted"
	| "blind_spot_untracked"
	| "blind_spot_stale"
	| "contradicts";

export type AuditReportReconRow = {
	findingId: string;
	readinessItemId: string | null;
	readinessItemLabel: string | null;
	readinessStatus: ReadinessItem["status"] | null;
	lastAssessed: string | null;
	evidenceNote: string | null;
	verdict: AuditReportReconVerdict;
};

const SMALL_NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"];

/** "one"/"two" read as prose; larger counts stay numeric. */
function spellSmall(n: number): string {
	return SMALL_NUMBER_WORDS[n] ?? String(n);
}

function monthsBetween(fromIso: string, toIso: string): number {
	const from = new Date(fromIso);
	const to = new Date(toIso);
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
	const months =
		(to.getFullYear() - from.getFullYear()) * 12 +
		(to.getMonth() - from.getMonth());
	return Math.max(0, months);
}

function reconVerdictFor(finding: AuditFindingRecord): AuditReportReconVerdict {
	switch (finding.reconciliation?.verdict) {
		case "supported":
		case "severity_mismatch":
			return "predicted";
		case "stale_readiness":
			return "blind_spot_stale";
		case "false_finding":
			return "contradicts";
		case "untracked_gap":
		case "needs_human_review":
		case undefined:
			return "blind_spot_untracked";
		default:
			return "blind_spot_untracked";
	}
}

function buildReconciliation(
	findings: AuditFindingRecord[],
	readinessById: Map<string, ReadinessItem>,
	reportDate: string | null,
): AuditReportReconRow[] {
	return findings.map((finding) => {
		const itemId = finding.reconciliation?.matchedRequirementIds[0] ?? null;
		const item = itemId ? (readinessById.get(itemId) ?? null) : null;
		const verdict = reconVerdictFor(finding);
		let evidenceNote = item?.notes ?? null;
		if (verdict === "blind_spot_stale" && item?.evidenceDate && reportDate) {
			const staleMonths = monthsBetween(item.evidenceDate, reportDate);
			evidenceNote = `${staleMonths} month${staleMonths === 1 ? "" : "s"} stale as of the report date${evidenceNote ? ` — ${evidenceNote}` : ""}`;
		}
		return {
			findingId: finding.$id,
			readinessItemId: itemId,
			readinessItemLabel: item?.label ?? null,
			readinessStatus: item?.status ?? null,
			lastAssessed: item?.evidenceDate ?? null,
			evidenceNote,
			verdict,
		};
	});
}

function excerpt(text: string, max = 160): string {
	const trimmed = text.trim();
	return trimmed.length > max ? `${trimmed.slice(0, max).trim()}…` : trimmed;
}

function buildSignals(
	findings: AuditFindingRecord[],
	readinessById: Map<string, ReadinessItem>,
): AuditReportSignal[] {
	const signals: AuditReportSignal[] = [];

	const contradicts = findings.filter(
		(f) => f.reconciliation?.verdict === "false_finding",
	);
	if (contradicts.length > 0) {
		signals.push({
			type: "contradicts_evidence",
			count: contradicts.length,
			findingIds: contradicts.map((f) => f.$id),
			detail: contradicts.map((f) => {
				const itemId = f.reconciliation?.matchedRequirementIds[0] ?? null;
				const item = itemId ? (readinessById.get(itemId) ?? null) : null;
				return {
					findingId: f.$id,
					readinessItemId: itemId,
					readinessItemLabel: item?.label ?? null,
					evidenceDate: item?.evidenceDate ?? null,
					managementResponseExcerpt: f.managementResponse
						? excerpt(f.managementResponse)
						: null,
				};
			}),
		});
	}

	const mismatched = findings.filter(
		(f) => f.reconciliation?.verdict === "severity_mismatch",
	);
	if (mismatched.length > 0) {
		signals.push({
			type: "severity_mismatch",
			count: mismatched.length,
			findingIds: mismatched.map((f) => f.$id),
			detail: mismatched.map((f) => ({
				findingId: f.$id,
				severityReported: f.severityReported,
				severityComputed: f.severityComputed,
				controlDeficiencyType: f.controlDeficiencyType,
				questionedCostsUsd: f.monetaryImpactUsd,
			})),
		});
	}

	const quarantined = findings.filter((f) => !f.citationCheckPassed);
	if (quarantined.length > 0) {
		signals.push({
			type: "quarantined",
			count: quarantined.length,
			findingIds: quarantined.map((f) => f.$id),
			detail: quarantined.map((f) => ({ findingId: f.$id })),
		});
	}

	const disputed = findings.filter((f) => f.status === "disputed");
	if (disputed.length > 0) {
		signals.push({
			type: "disputed",
			count: disputed.length,
			findingIds: disputed.map((f) => f.$id),
			detail: disputed.map((f) => ({
				findingId: f.$id,
				disputeReason: f.disputeReason,
			})),
		});
	}

	const blindSpots = findings.filter((f) =>
		["untracked_gap", "stale_readiness"].includes(
			f.reconciliation?.verdict ?? "",
		),
	);
	if (blindSpots.length > 0) {
		signals.push({
			type: "blind_spots",
			count: blindSpots.length,
			findingIds: blindSpots.map((f) => f.$id),
			detail: blindSpots.map((f) => {
				const itemId = f.reconciliation?.matchedRequirementIds[0] ?? null;
				const item = itemId ? (readinessById.get(itemId) ?? null) : null;
				return {
					findingId: f.$id,
					reason:
						f.reconciliation?.verdict === "stale_readiness"
							? "stale"
							: "untracked",
					readinessItemId: itemId,
					readinessItemLabel: item?.label ?? null,
					evidenceDate: item?.evidenceDate ?? null,
				};
			}),
		});
	}

	const repeats = findings.filter((f) => f.isRepeat);
	if (repeats.length > 0) {
		signals.push({
			type: "repeat",
			count: repeats.length,
			findingIds: repeats.map((f) => f.$id),
			detail: repeats.map((f) => ({
				findingId: f.$id,
				priorFindingId: f.repeatOfFindingId,
			})),
		});
	}

	const predicted = findings.filter((f) =>
		["supported", "severity_mismatch"].includes(
			f.reconciliation?.verdict ?? "",
		),
	);
	if (predicted.length > 0) {
		signals.push({
			type: "predicted",
			count: predicted.length,
			findingIds: predicted.map((f) => f.$id),
			detail: predicted.map((f) => {
				const itemId = f.reconciliation?.matchedRequirementIds[0] ?? null;
				const item = itemId ? (readinessById.get(itemId) ?? null) : null;
				return {
					findingId: f.$id,
					readinessItemId: itemId,
					readinessItemLabel: item?.label ?? null,
				};
			}),
		});
	}

	return signals;
}

const CONTROL_DEFICIENCY_KEYS: ControlDeficiencyType[] = [
	"material_weakness",
	"significant_deficiency",
	"control_deficiency",
];

export async function generateFeedbackReport(
	orgId: string,
	documentId: string,
): Promise<Record<string, unknown>> {
	const [document, findings, caps] = await Promise.all([
		getAuditDocument(orgId, documentId),
		listFindings({ orgId, documentId, limit: 200 }),
		listCaps({ orgId, documentId, limit: 200 }),
	]);

	const classification = (document?.metadata?.classification ?? {}) as {
		auditType?: string;
		frameworks?: string[];
		auditorName?: string | null;
		reportNumber?: string | null;
		reportDate?: string | null;
	};
	const readiness = document
		? await loadReadinessItems(orgId, {
				fileName: document.fileName,
				auditType: classification.auditType,
				frameworks: classification.frameworks,
				auditorName: classification.auditorName,
				reportNumber: classification.reportNumber,
			})
		: [];
	const readinessById = new Map(
		readiness.map((item) => [item.requirementId, item]),
	);

	const quarantined = findings.filter(
		(finding) => !finding.citationCheckPassed,
	);
	const repeats = findings.filter((finding) => finding.isRepeat);
	const bySeverity = findings.reduce<Record<string, number>>((acc, finding) => {
		acc[finding.severityComputed] = (acc[finding.severityComputed] ?? 0) + 1;
		return acc;
	}, {});
	const disputed = findings.filter((finding) => finding.status === "disputed");
	const falseFindings = findings.filter(
		(finding) => finding.reconciliation?.verdict === "false_finding",
	);
	const stale = findings.filter(
		(finding) => finding.reconciliation?.verdict === "stale_readiness",
	);
	const untracked = findings.filter(
		(finding) => finding.reconciliation?.verdict === "untracked_gap",
	);
	const predicted = findings.filter((finding) =>
		["supported", "severity_mismatch"].includes(
			finding.reconciliation?.verdict || "",
		),
	);

	const questioned = findings.filter(
		(finding) => (finding.monetaryImpactUsd ?? 0) > 0,
	);
	const questionedCosts =
		questioned.length > 0
			? {
					total: questioned.reduce(
						(sum, f) => sum + (f.monetaryImpactUsd ?? 0),
						0,
					),
					findingIds: questioned.map((f) => f.$id),
				}
			: null;

	const classificationCounts = CONTROL_DEFICIENCY_KEYS.reduce<
		Record<ControlDeficiencyType, number>
	>(
		(acc, key) => {
			acc[key] = findings.filter((f) => f.controlDeficiencyType === key).length;
			return acc;
		},
		{ material_weakness: 0, significant_deficiency: 0, control_deficiency: 0 },
	);

	const sefa = document?.metadata?.sefa as
		| { programs?: Array<{ name: string }> }
		| null
		| undefined;
	/** The SEFA only lists programs the auditor tested as major — no separate major/non-major flag is extracted. */
	const programCount = sefa?.programs?.length ?? 0;
	const majorProgramCount = programCount;

	const mismatched = findings.filter(
		(finding) => finding.reconciliation?.verdict === "severity_mismatch",
	);

	// Regenerated per report-view-spec.md: no counts restated elsewhere, no "(s)" artifacts,
	// two paragraphs read as prose. **bold** marks the clause the UI renders with <strong>.
	const attentionCount = falseFindings.length + mismatched.length;
	let extractionNote = quarantined.length
		? `${spellSmall(quarantined.length)} of the ${findings.length} finding${findings.length === 1 ? "" : "s"} could not be matched to a source quote, so ${quarantined.length === 1 ? "it was" : "they were"} held back for a manual read.`
		: `All ${findings.length === 1 ? "one finding" : `${spellSmall(findings.length)} findings`} extracted cleanly with a verified source quote, so nothing was held back for review.`;
	if (attentionCount > 0) {
		const attentionParts: string[] = [];
		if (falseFindings.length > 0) {
			attentionParts.push(
				`${spellSmall(falseFindings.length)} appear${falseFindings.length === 1 ? "s" : ""} to contradict evidence already on file`,
			);
		}
		if (mismatched.length > 0) {
			attentionParts.push(
				`${spellSmall(mismatched.length)} carr${mismatched.length === 1 ? "ies" : "y"} a severity the auditor's own classification doesn't support`,
			);
		}
		const attentionLead = spellSmall(attentionCount);
		extractionNote += ` **${attentionLead.charAt(0).toUpperCase()}${attentionLead.slice(1)} of the ${spellSmall(findings.length)} warrant${attentionCount === 1 ? "s" : ""} attention before you start confirming:** ${attentionParts.join(", and ")}.`;
	}

	let readinessNote =
		predicted.length > 0 || stale.length + untracked.length > 0
			? `Your readiness tracking predicted ${spellSmall(predicted.length)} of these findings and missed ${spellSmall(stale.length + untracked.length)} other${stale.length + untracked.length === 1 ? "" : "s"}`
			: "Your readiness tracking had no prior signal on any of these findings";
	if (untracked.length > 0) {
		readinessNote += ` — including ${untracked.length === 1 ? "one topic it has no item for" : `${spellSmall(untracked.length)} topics it has no item for`} at all`;
	}
	readinessNote += ".";
	const capNote =
		caps.length === 0 && findings.length > 0
			? " **No corrective actions have been created yet.**"
			: caps.length > 0
				? ` **${caps.filter((c) => ["open", "in_progress", "overdue", "escalated"].includes(c.status)).length} of ${caps.length} corrective action${caps.length === 1 ? "" : "s"} still open.**`
				: "";
	const notes = [extractionNote, `${readinessNote}${capNote}`];

	return {
		generatedAt: new Date().toISOString(),
		findingCount: findings.length,
		quarantinedCount: quarantined.length,
		repeatCount: repeats.length,
		disputedCount: disputed.length,
		auditorErrorCount: falseFindings.length,
		readinessBlindSpots: stale.length + untracked.length,
		readinessPredictedCount: predicted.length,
		severityCounts: bySeverity,
		capCount: caps.length,
		openCapCount: caps.filter((cap) =>
			["open", "in_progress", "overdue", "escalated"].includes(cap.status),
		).length,
		recurringThemes: repeats.map((finding) => finding.title),
		notes,
		signals: buildSignals(findings, readinessById),
		readinessReconciliation: buildReconciliation(
			findings,
			readinessById,
			classification.reportDate ?? null,
		),
		questionedCosts,
		classificationCounts,
		majorProgramCount,
		programCount,
	};
}
