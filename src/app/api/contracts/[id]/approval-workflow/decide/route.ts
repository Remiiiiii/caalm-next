import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	errorResponse,
	forbiddenResponse,
	generateRequestId,
	successResponse,
	unauthorizedResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";
import {
	decide,
	getWorkflowForViewer,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import type { ApprovalDecision } from "@/lib/approvals/contractApprovalWorkflow.types";
import {
	getUserDefaultOrganization,
	hasPermission,
} from "@/lib/rbac/permissions";

const VALID_DECISIONS: ApprovalDecision[] = [
	"approved",
	"changes_requested",
	"rejected",
];

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const user = await getCurrentUser();
		if (!user)
			return unauthorizedResponse("Authentication required", requestId);

		const { id: contractId } = await context.params;
		if (!contractId) {
			return validationErrorResponse("Contract ID is required", requestId);
		}

		const body = await request.json().catch(() => ({}));
		const decision = body.decision as ApprovalDecision;
		const notes = typeof body.notes === "string" ? body.notes : undefined;
		const path =
			typeof body.path === "string" ? body.path : "/contracts/approvals";

		if (!VALID_DECISIONS.includes(decision)) {
			return validationErrorResponse("Invalid decision", requestId);
		}

		// Workflow assignees use Auth accountId; RBAC checks use users-table $id.
		const viewerUserId = user.accountId || user.$id;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const canReview = orgId
			? await hasPermission(user.$id, PERMISSIONS.CONTRACTS.REVIEW, orgId)
			: false;
		const canApprove = orgId
			? await hasPermission(user.$id, PERMISSIONS.CONTRACTS.APPROVE, orgId)
			: false;
		const isAdminOverride = orgId
			? await hasPermission(user.$id, PERMISSIONS.APPROVALS.OVERRIDE, orgId)
			: false;

		if (!canReview && !canApprove && !isAdminOverride) {
			return forbiddenResponse(
				"Permission denied: decide contract approval",
				requestId,
			);
		}

		const before = await getWorkflowForViewer(contractId, viewerUserId, {
			isAdminOverride,
		});
		if (!before.canDecide && !isAdminOverride) {
			return forbiddenResponse(
				"You cannot decide the current approval step",
				requestId,
			);
		}

		const result = await decide({
			contractId,
			viewerUserId,
			decision,
			notes,
			adminOverride: isAdminOverride && !before.canDecide,
		});

		revalidatePath(path);
		revalidatePath("/contracts");
		revalidatePath("/contracts/approvals");

		const payload = await getWorkflowForViewer(contractId, viewerUserId, {
			isAdminOverride,
		});

		return successResponse(
			{ ...payload, contractStatus: result.contractStatus },
			{ requestId, message: "Decision recorded" },
		);
	} catch (error) {
		console.error("[approval-workflow decide]", error);
		const message =
			error instanceof Error ? error.message : "Failed to record decision";
		const status =
			message.includes("expired") || message.includes("inactive")
				? 409
				: message.includes("not an assignee") ||
						message.includes("cannot approve") ||
						message.includes("cannot be decided") ||
						message.includes("No active approval step")
					? 403
					: message.includes("Notes are required")
						? 400
						: 500;
		return errorResponse(message, status, { requestId });
	}
}
