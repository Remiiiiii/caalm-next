export const AUDIT_DOCUMENT_STATUSES = [
	"uploaded",
	"extracting",
	"classifying",
	"extracting_findings",
	"reconciling",
	"scoring",
	"complete",
	"failed",
] as const;

export type AuditDocumentStatus = (typeof AUDIT_DOCUMENT_STATUSES)[number];

export const AUDIT_FINDING_STATUSES = [
	"draft",
	"confirmed",
	"disputed",
	"rectified",
	"closed",
	"accepted_risk",
] as const;

export type AuditFindingStatus = (typeof AUDIT_FINDING_STATUSES)[number];

export const AUDIT_CAP_STATUSES = [
	"open",
	"in_progress",
	"pending_verification",
	"verified",
	"closed",
	"overdue",
	"escalated",
] as const;

export type AuditCapStatus = (typeof AUDIT_CAP_STATUSES)[number];

export const AUDIT_SEVERITIES = [
	"critical",
	"high",
	"medium",
	"low",
	"informational",
] as const;

export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const RECONCILIATION_VERDICTS = [
	"false_finding",
	"supported",
	"stale_readiness",
	"severity_mismatch",
	"untracked_gap",
	"needs_human_review",
] as const;

export type ReconciliationVerdict = (typeof RECONCILIATION_VERDICTS)[number];

export const CAP_GENERATING_VERDICTS: ReconciliationVerdict[] = [
	"supported",
	"severity_mismatch",
	"untracked_gap",
];

export const AUDIT_TYPES = [
	"soc2_type2",
	"financial_statement",
	"compliance",
	"other",
] as const;

export type AuditType = (typeof AUDIT_TYPES)[number];

export const CONTROL_DEFICIENCY_TYPES = [
	"material_weakness",
	"significant_deficiency",
	"control_deficiency",
] as const;

export type ControlDeficiencyType = (typeof CONTROL_DEFICIENCY_TYPES)[number];

export interface ProcessingLogEntry {
	at: string;
	stage: string;
	status: "started" | "complete" | "failed";
	message?: string;
}

export interface AuditCitation {
	quote: string;
	page?: number | null;
	section?: string | null;
	matched: boolean;
}

export interface ReadinessItem {
	requirementId: string;
	label: string;
	status: "ready" | "gap" | "in_progress" | "unknown";
	evidenceType?: string;
	evidenceDate?: string;
	notes?: string;
}

export interface ReconciliationResult {
	verdict: ReconciliationVerdict;
	rationale: string;
	matchedRequirementIds: string[];
	confidence: number;
	alsoSupported?: boolean;
	suggestCreateReadiness?: boolean;
}

export interface AuditDocumentRecord {
	$id: string;
	orgId: string;
	uploadedBy: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
	storageFileId: string;
	contentHash: string;
	status: AuditDocumentStatus;
	processingLog: ProcessingLogEntry[];
	summary: string | null;
	metadata: Record<string, unknown> | null;
	errorMessage: string | null;
	deletedAt: string | null;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface AuditFindingRecord {
	$id: string;
	orgId: string;
	documentId: string;
	title: string;
	description: string;
	frameworkRefs: string[];
	severityReported: AuditSeverity | null;
	severityComputed: AuditSeverity;
	likelihood: number;
	impact: number;
	riskScore: number;
	confidence: number;
	citations: AuditCitation[];
	citationCheckPassed: boolean;
	findingCode: string | null;
	managementResponse: string | null;
	monetaryImpactUsd: number | null;
	controlDeficiencyType: ControlDeficiencyType | null;
	findingKey: string;
	isRepeat: boolean;
	repeatOfFindingId: string | null;
	status: AuditFindingStatus;
	reconciliation: ReconciliationResult | null;
	disputeReason: string | null;
	riskAcceptanceReason: string | null;
	riskAcceptedBy: string | null;
	riskAcceptedAt: string | null;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface AuditCapRecord {
	$id: string;
	orgId: string;
	documentId: string;
	findingId: string;
	title: string;
	rootCause: string;
	assigneeId: string | null;
	status: AuditCapStatus;
	dueAt: string;
	escalationTier: number;
	verificationEvidence: string | null;
	closedAt: string | null;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface AuditFeedbackRecord {
	$id: string;
	orgId: string;
	documentId: string;
	report: Record<string, unknown>;
	$createdAt?: string;
}
