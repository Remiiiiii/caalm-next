import type {
	ApprovalStepKind,
	ApprovalStepStatus,
} from "@/lib/approvals/contractApprovalWorkflow.types";

const DECIDABLE_KINDS: ApprovalStepKind[] = [
	"department_review",
	"internal_approval",
	"executive_approval",
];

const CLAIMABLE_KINDS: ApprovalStepKind[] = [
	"department_review",
	"internal_approval",
	"executive_approval",
	"awaiting_executive",
];

const COMPLETED_STATUSES = new Set([
	"active",
	"pending-signature",
	"pending-countersign",
]);

export interface ViewerCapabilityFlags {
	canDecideAsAssignee: boolean;
	canClaimStep: boolean;
	canAdminOverrideActiveStep: boolean;
	canAdminOverrideCompleted: boolean;
	canDecide: boolean;
	canOverride: boolean;
	/** False for REVIEW-only department managers on department_review. */
	canReject: boolean;
	decisionBlockReason?: string;
}

export function emptyViewerFlags(
	reason?: string,
): ViewerCapabilityFlags {
	return {
		canDecideAsAssignee: false,
		canClaimStep: false,
		canAdminOverrideActiveStep: false,
		canAdminOverrideCompleted: false,
		canDecide: false,
		canOverride: false,
		canReject: false,
		decisionBlockReason: reason,
	};
}

export function computeViewerCapabilities(input: {
	frozen: boolean;
	current?: { kind: ApprovalStepKind; status: ApprovalStepStatus };
	contractStatus: string;
	isAssignee: boolean;
	canDecideByRole: boolean;
	isAdminOverride: boolean;
	/** When omitted, treat as able to reject (keeps existing tests valid). */
	canApprove?: boolean;
}): ViewerCapabilityFlags {
	if (input.frozen) {
		return emptyViewerFlags("This workflow is frozen");
	}

	const current = input.current;
	const isDecidable =
		current?.status === "current" && DECIDABLE_KINDS.includes(current.kind);
	const isCompleted =
		!isDecidable &&
		(current?.kind === "activated" ||
			current?.status === "complete" ||
			COMPLETED_STATUSES.has(input.contractStatus));

	const canDecideAsAssignee =
		!!isDecidable && input.isAssignee && input.canDecideByRole;
	const canClaimStep =
		!!current &&
		current.status === "current" &&
		CLAIMABLE_KINDS.includes(current.kind) &&
		!input.isAssignee &&
		input.canDecideByRole;
	const canAdminOverrideActiveStep = !!isDecidable && input.isAdminOverride;
	const canAdminOverrideCompleted = isCompleted && input.isAdminOverride;

	let decisionBlockReason: string | undefined;
	if (!isDecidable) {
		decisionBlockReason = "This step cannot be decided";
	} else if (!input.canDecideByRole && !input.isAdminOverride) {
		decisionBlockReason = "You don't have permission to decide this step";
	} else if (!input.isAssignee && !input.isAdminOverride) {
		decisionBlockReason = "You're not assigned to this step";
	}

	const mayDecide =
		canDecideAsAssignee ||
		canAdminOverrideActiveStep ||
		canAdminOverrideCompleted;
	const canApprove = input.canApprove !== false;
	const canReject =
		!!mayDecide &&
		(input.isAdminOverride ||
			current?.kind !== "department_review" ||
			canApprove);

	return {
		canDecideAsAssignee,
		canClaimStep,
		canAdminOverrideActiveStep,
		canAdminOverrideCompleted,
		canDecide: canDecideAsAssignee,
		canOverride: canAdminOverrideActiveStep || canAdminOverrideCompleted,
		canReject,
		decisionBlockReason,
	};
}
