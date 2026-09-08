export type ApprovalStepKind =
	| "submitted"
	| "department_review"
	| "internal_approval"
	| "executive_approval"
	| "activated"
	| "awaiting_executive";

export type ApprovalStepStatus =
	| "complete"
	| "current"
	| "pending"
	| "changes_requested"
	| "rejected"
	| "skipped";

export type ApprovalDecision = "approved" | "changes_requested" | "rejected";

export type ApprovalSlaStatus = "on_track" | "at_risk" | "breached";

export type ApprovalNotificationType =
	| "upload_submitted"
	| "pending_review"
	| "stage_advanced"
	| "executive_approved"
	| "changes_requested"
	| "rejected"
	| "needs_executive_assignment"
	| "reassigned"
	| "resubmitted"
	| "sla_at_risk"
	| "sla_due_soon"
	| "sla_breached"
	| "sla_escalated";

export interface ApprovalWorkflowStep {
	id: string;
	kind: ApprovalStepKind;
	label: string;
	assigneeUserIds: string[];
	status: ApprovalStepStatus;
	completedAt?: string;
	completedByUserId?: string;
	decision?: ApprovalDecision;
	notes?: string;
	/** ISO timestamp when this step became current */
	startedAt?: string;
	/** ISO due datetime computed from the org SLA policy */
	dueAt?: string;
	slaStatus?: ApprovalSlaStatus;
	slaBreachedAt?: string;
	lastReminderAt?: string;
	/** 0 = none, 1 = at-risk, 2 = breached, 3 = repeat */
	escalationLevel?: number;
}

export interface ApprovalWorkflowNotification {
	id: string;
	type: ApprovalNotificationType;
	sentAt: string;
	recipientUserIds: string[];
	stepId?: string;
	label?: string;
}

export interface ApprovalWorkflowState {
	version: 1;
	currentStepIndex: number;
	derivedAt: string;
	steps: ApprovalWorkflowStep[];
	notifications: ApprovalWorkflowNotification[];
}

export interface ApprovalParticipant {
	userId: string;
	fullName: string;
	email?: string;
	department?: string;
	subDepartment?: string;
	division?: string;
	profileImageUrl?: string | null;
	isYou?: boolean;
}

/** People the viewer can pick when reassigning the current step. */
export interface ApprovalReassignCandidate {
	userId: string;
	fullName: string;
	email: string;
	roleLabel: string;
	/** Resolved profile photo URL when the user has uploaded one */
	profileImageUrl?: string | null;
}

export interface ApprovalWorkflowViewerPayload {
	contractId: string;
	contractName: string;
	contractStatus: string;
	department?: string;
	businessUnit?: string;
	subDepartment?: string;
	currentStepIndex: number;
	steps: Array<
		ApprovalWorkflowStep & {
			participants: ApprovalParticipant[];
			notifications: ApprovalWorkflowNotification[];
			assigneeHint?: string;
		}
	>;
	notifications: ApprovalWorkflowNotification[];
	canDecide: boolean;
	canOverride: boolean;
	/** Current step is awaiting_executive with no assignees. */
	needsExecutiveAssignment: boolean;
	/** Viewer may assign Super Admin / Org Admin to the executive step. */
	canAssignExecutive: boolean;
	/** Uploader (or admin) may resubmit after changes_requested. */
	canResubmit: boolean;
	viewerUserId: string;
	uploaderUserId?: string;
	/** Eligible people for Assign / Reassign (pick by name; IDs stay server-side). */
	reassignCandidates?: ApprovalReassignCandidate[];
	/** True when status is expired or inactive — history only, no SLA or decisions. */
	workflowFrozen?: boolean;
	expirationAttestationId?: string;
}
