export type AttestationEntityType = "contract" | "license";
export type AttestationPhase = "pre_expiry" | "post_expiry";
export type AttestationIntent = "intentional" | "unintentional";
export type AttestationStatus = "pending" | "submitted" | "reviewed" | "waived";

export type ExpirationReasonCategory =
	| "strategic_termination"
	| "budget_constraints"
	| "vendor_non_response"
	| "approval_bottleneck"
	| "missed_renewal"
	| "operational_oversight"
	| "auto_renew_failed"
	| "counterparty_terminated"
	| "other";

export const REASON_CATEGORY_LABELS: Record<ExpirationReasonCategory, string> = {
	strategic_termination: "Strategic termination",
	budget_constraints: "Budget constraints",
	vendor_non_response: "Vendor did not respond",
	approval_bottleneck: "Approval bottleneck",
	missed_renewal: "Missed renewal window",
	operational_oversight: "Operational oversight",
	auto_renew_failed: "Auto-renew failed",
	counterparty_terminated: "Counterparty terminated",
	other: "Other",
};

export interface ExpirationAttestation {
	$id: string;
	orgId: string;
	entityType: AttestationEntityType;
	entityId: string;
	entityName: string;
	phase: AttestationPhase;
	intent: AttestationIntent;
	status: AttestationStatus;
	reasonCategory?: ExpirationReasonCategory;
	narrative?: string;
	accountableUserId?: string;
	submittedBy?: string;
	submittedAt?: string;
	reviewedBy?: string;
	reviewedAt?: string;
	signatureFileId?: string;
	expiredAt?: string;
	priorExpiryDate?: string;
	linkedStepKind?: string;
	slaStatusAtExpiry?: string;
	snoozeCount?: number;
	alertDismissCount?: number;
	renewalBlocked: boolean;
}
