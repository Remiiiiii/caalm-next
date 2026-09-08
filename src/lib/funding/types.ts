/**
 * Funding & Retention domain types.
 *
 * Retention = protect dollars already on the books (reads Contracts).
 * Pursuits = win new dollars (bid pipeline; optional SAM.gov link).
 * Obligations = structured mid-contract / renewal work that keeps money.
 */

export const PURSUIT_STAGES = [
	"watching",
	"qualifying",
	"pursuing",
	"submitted",
	"won",
	"lost",
	"abandoned",
] as const;
export type PursuitStage = (typeof PURSUIT_STAGES)[number];

export const PURSUIT_SOURCES = ["manual", "sam_gov"] as const;
export type PursuitSource = (typeof PURSUIT_SOURCES)[number];

export const OBLIGATION_STATUSES = [
	"open",
	"in_progress",
	"done",
	"waived",
	"overdue",
] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

export const OBLIGATION_KINDS = [
	"renewal",
	"reporting",
	"deliverable",
	"compliance",
	"payment",
	"other",
] as const;
export type ObligationKind = (typeof OBLIGATION_KINDS)[number];

export const RETENTION_HEALTH = [
	"protected",
	"protecting",
	"at_risk",
	"expired",
] as const;
export type RetentionHealth = (typeof RETENTION_HEALTH)[number];

export type FundingPursuit = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	title: string;
	description?: string;
	amount: number;
	currency: string;
	stage: PursuitStage;
	source: PursuitSource;
	samNoticeId?: string;
	samUrl?: string;
	responseDeadline?: string;
	ownerUserId?: string;
	ownerName?: string;
	department?: string;
	notes?: string;
	linkedProposalId?: string;
	createdByUserId: string;
	createdByName?: string;
};

export type ContractObligation = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	contractId: string;
	contractName?: string;
	title: string;
	description?: string;
	kind: ObligationKind;
	status: ObligationStatus;
	ownerUserId?: string;
	ownerName?: string;
	dueDate?: string;
	reminderDaysBefore?: number;
	linkUrl?: string;
	renewalLinked: boolean;
	completedAt?: string;
	createdByUserId: string;
};

export type RetentionStream = {
	contractId: string;
	contractName: string;
	amount: number;
	currency: string;
	expiryDate: string | null;
	daysUntilExpiry: number | null;
	lifecycleStatus?: string;
	status?: string;
	department?: string;
	ownerName?: string;
	health: RetentionHealth;
	openObligationCount: number;
	overdueObligationCount: number;
	obligations: ContractObligation[];
};

export type RetentionSummary = {
	totalAtRiskAmount: number;
	totalProtectingAmount: number;
	totalProtectedAmount: number;
	streamCount: number;
	streams: RetentionStream[];
};
