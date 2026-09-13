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
} from "@/lib/api/contracts/utils/response.util";
import {
	claimCurrentStep,
	getWorkflowForViewer,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import {
	getUserDefaultOrganization,
	hasPermission,
} from "@/lib/rbac/permissions";

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
			return errorResponse("Contract ID is required", 400, { requestId });
		}

		const body = await request.json().catch(() => ({}));
		const path =
			typeof body.path === "string" ? body.path : "/contracts/approvals";

		const viewerUserId = user.accountId || user.$id;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const canReview = orgId
			? await hasPermission(user.$id, PERMISSIONS.CONTRACTS.REVIEW, orgId)
			: false;
		const canApprove = orgId
			? await hasPermission(user.$id, PERMISSIONS.CONTRACTS.APPROVE, orgId)
			: false;
		if (!canReview && !canApprove) {
			return forbiddenResponse(
				"Permission denied: claim approval step",
				requestId,
			);
		}

		const before = await getWorkflowForViewer(contractId, viewerUserId, {
			isAdminOverride: false,
		});
		if (!before.canClaimStep) {
			return forbiddenResponse(
				before.decisionBlockReason || "You cannot claim this step",
				requestId,
			);
		}

		await claimCurrentStep({ contractId, viewerUserId });
		revalidatePath(path);
		revalidatePath("/contracts");
		revalidatePath("/contracts/approvals");

		const isAdminOverride = orgId
			? await hasPermission(user.$id, PERMISSIONS.APPROVALS.OVERRIDE, orgId)
			: false;
		const payload = await getWorkflowForViewer(contractId, viewerUserId, {
			isAdminOverride,
		});
		return successResponse(payload, { requestId, message: "Step claimed" });
	} catch (error) {
		console.error("[approval-workflow claim]", error);
		const message =
			error instanceof Error ? error.message : "Failed to claim step";
		return errorResponse(message, message.includes("already") ? 400 : 500, {
			requestId,
		});
	}
}
