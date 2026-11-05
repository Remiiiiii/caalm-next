import type { AuditCapTask, AuditFindingRecord, AuditSeverity } from "./types";

const SLA_DAYS: Record<AuditSeverity, number> = {
	critical: 30,
	high: 60,
	medium: 90,
	low: 180,
	informational: 180,
};

const ROOT_CAUSES = [
	"process_gap",
	"control_operating_failure",
	"control_partially_implemented",
	"policy_missing",
	"training",
	"system_control",
	"vendor",
	"human_error",
	"unknown",
] as const;

export type CapRootCause = (typeof ROOT_CAUSES)[number];

export function slaDueAt(severity: AuditSeverity, from = new Date()): string {
	const days = SLA_DAYS[severity] ?? 30;
	const due = new Date(from);
	due.setUTCDate(due.getUTCDate() + days);
	return due.toISOString();
}

export function inferRootCause(text: string): CapRootCause {
	const haystack = text.toLowerCase();
	if (haystack.includes("train")) return "training";
	if (haystack.includes("policy")) return "policy_missing";
	if (haystack.includes("vendor") || haystack.includes("third party")) {
		return "vendor";
	}
	if (
		haystack.includes("partial") ||
		haystack.includes("not cover") ||
		haystack.includes("subnet") ||
		haystack.includes("scan")
	) {
		return "control_partially_implemented";
	}
	if (
		haystack.includes("access review") ||
		haystack.includes("cost transfer") ||
		haystack.includes("not performed") ||
		haystack.includes("operating")
	) {
		return "control_operating_failure";
	}
	if (haystack.includes("system") || haystack.includes("access")) {
		return "system_control";
	}
	if (haystack.includes("process")) return "process_gap";
	return "unknown";
}

export function requiresCloseEvidence(severity: AuditSeverity): boolean {
	return severity === "critical" || severity === "high";
}

/** One task per obligation. Evidence requirement mirrors the CAP's own close-evidence rule for this severity. */
export function draftTasksFromFinding(
	finding: Pick<
		AuditFindingRecord,
		"correctionObligations" | "severityComputed"
	>,
): AuditCapTask[] {
	const requiresEvidence = requiresCloseEvidence(finding.severityComputed);
	return finding.correctionObligations.map((text, index) => ({
		id: `t-${index + 1}`,
		text,
		done: false,
		requiresEvidence,
		evidenceIds: [],
	}));
}

/** `canClose` is true only when every task is done, and every evidence-requiring task has evidence. */
export function computeCapCloseState(tasks: AuditCapTask[]): {
	canClose: boolean;
	closeBlocker: string | null;
} {
	const remaining = tasks.filter((task) => !task.done).length;
	if (remaining > 0) {
		return {
			canClose: false,
			closeBlocker: `${remaining} task${remaining === 1 ? "" : "s"} remaining before this can be closed.`,
		};
	}
	const needsEvidence = tasks.filter(
		(task) => task.requiresEvidence && task.evidenceIds.length === 0,
	).length;
	if (needsEvidence > 0) {
		return {
			canClose: false,
			closeBlocker: `Evidence is required on ${needsEvidence} task${needsEvidence === 1 ? "" : "s"} before this can be closed.`,
		};
	}
	return { canClose: true, closeBlocker: null };
}

export { ROOT_CAUSES, SLA_DAYS };
