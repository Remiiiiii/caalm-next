import type { AuditSeverity } from "./types";

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

export { ROOT_CAUSES, SLA_DAYS };
