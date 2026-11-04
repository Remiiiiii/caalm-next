import type { AssistantResearchStep } from "@/lib/assistant/assistant-research-steps";

/** Client-side apply trace labels (matches server apply_audit_remediation work). */
export function buildApplyAuditRemediationSteps(
	capTitle?: string,
): AssistantResearchStep[] {
	const name = capTitle?.trim() || "corrective action";
	return [
		{
			id: "load-cap",
			label: `Loading “${name}”…`,
			kind: "database",
			status: "pending",
		},
		{
			id: "update-status",
			label: "Updating status Open → In progress…",
			kind: "progress",
			status: "pending",
		},
		{
			id: "audit-log",
			label: "Recording activity in audit log…",
			kind: "database",
			status: "pending",
		},
	];
}
