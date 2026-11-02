import type { ProcessingLogEntry } from "./types";

export const AUDIT_PROGRESS_STEP_KEYS = [
	"upload",
	"extract",
	"classify",
	"extract_findings",
	"cite_verify",
	"risk_score",
] as const;

export type AuditProgressStepKey = (typeof AUDIT_PROGRESS_STEP_KEYS)[number];

export type AuditProgressStepState = "pending" | "active" | "done" | "failed";

export type AuditProgressStep = {
	key: AuditProgressStepKey;
	label: string;
	state: AuditProgressStepState;
};

const BASE_LABEL: Record<AuditProgressStepKey, string> = {
	upload: "Upload",
	extract: "Extract",
	classify: "Classify",
	extract_findings: "Finding citations",
	cite_verify: "Verify citations",
	risk_score: "Risk score",
};

function latestForStage(
	log: ProcessingLogEntry[],
	stage: string,
): ProcessingLogEntry | undefined {
	for (let index = log.length - 1; index >= 0; index -= 1) {
		if (log[index]?.stage === stage) return log[index];
	}
	return undefined;
}

function formatLabel(key: AuditProgressStepKey, entry?: ProcessingLogEntry): string {
	const base = BASE_LABEL[key];
	const message = entry?.message?.trim();
	if (!message) return base;
	if (key === "extract") return `${base} · ${message}`;
	if (key === "classify") return `${base} · ${message.replaceAll("_", " ")}`;
	return base;
}

function stateFromEntry(
	entry: ProcessingLogEntry | undefined,
	uploadAssumedComplete: boolean,
	key: AuditProgressStepKey,
): AuditProgressStepState {
	if (entry?.status === "complete") return "done";
	if (entry?.status === "failed") return "failed";
	if (entry?.status === "started") return "active";
	if (key === "upload" && uploadAssumedComplete) return "done";
	return "pending";
}

export function buildAuditProgress(
	log: ProcessingLogEntry[],
	options?: { uploadComplete?: boolean; failed?: boolean },
): { steps: AuditProgressStep[]; percent: number } {
	const steps = AUDIT_PROGRESS_STEP_KEYS.map((key) => {
		const entry = latestForStage(log, key);
		return {
			key,
			label: formatLabel(key, entry),
			state: stateFromEntry(entry, Boolean(options?.uploadComplete), key),
		};
	});

	if (options?.failed) {
		const activeIndex = steps.findIndex((step) => step.state === "active");
		const pendingIndex = steps.findIndex((step) => step.state === "pending");
		const failAt = activeIndex >= 0 ? activeIndex : pendingIndex;
		if (failAt >= 0 && steps[failAt]?.state !== "done") {
			steps[failAt] = { ...steps[failAt], state: "failed" };
		}
	}

	const doneCount = steps.filter((step) => step.state === "done").length;
	return {
		steps,
		percent: Math.round((doneCount / AUDIT_PROGRESS_STEP_KEYS.length) * 100),
	};
}
