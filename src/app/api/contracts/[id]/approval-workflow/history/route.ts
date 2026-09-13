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
import { historyFromNotifications } from "@/lib/approvals/approvalHistory";
import { getWorkflowForViewer } from "@/lib/approvals/ContractApprovalWorkflowService";
import {
	getUserDefaultOrganization,
	hasPermission,
} from "@/lib/rbac/permissions";

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const user = await getCurrentUser();
		if (!user)
			return unauthorizedResponse("Authentication required", requestId);

		const { id: contractId } = await context.params;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const canView = orgId
			? await hasPermission(user.$id, PERMISSIONS.CONTRACTS.VIEW, orgId)
			: false;
		if (!canView) {
			return forbiddenResponse("Permission denied: view contract", requestId);
		}

		const viewerUserId = user.accountId || user.$id;
		const isAdminOverride = orgId
			? await hasPermission(user.$id, PERMISSIONS.APPROVALS.OVERRIDE, orgId)
			: false;
		const workflow = await getWorkflowForViewer(contractId, viewerUserId, {
			isAdminOverride,
		});
		return successResponse(
			{ events: historyFromNotifications(workflow.notifications) },
			{ requestId },
		);
	} catch (error) {
		console.error("[approval-workflow history]", error);
		return errorResponse(
			error instanceof Error ? error.message : "Failed to load history",
			500,
			{ requestId },
		);
	}
}
