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

export type ApprovalNotificationType =
	| "upload_submitted"
	| "pending_review"
	| "stage_advanced"
	| "executive_approved"
	| "changes_requested"
	| "rejected";

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
		}
	>;
	notifications: ApprovalWorkflowNotification[];
	canDecide: boolean;
	canOverride: boolean;
	viewerUserId: string;
}
