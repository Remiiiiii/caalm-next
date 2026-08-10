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
import { backfillPendingWorkflows } from "@/lib/approvals/ContractApprovalWorkflowService";
import {
	getUserDefaultOrganization,
	hasPermission,
} from "@/lib/rbac/permissions";

export async function POST(_request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const user = await getCurrentUser();
		if (!user)
			return unauthorizedResponse("Authentication required", requestId);

		const org = await getUserDefaultOrganization(user.$id);
		const canApprove = org?.orgId
			? await hasPermission(user.$id, PERMISSIONS.CONTRACTS.APPROVE, org.orgId)
			: false;

		if (!canApprove) {
			return forbiddenResponse("Permission denied", requestId);
		}

		const updated = await backfillPendingWorkflows(500);
		return successResponse({ updated }, { requestId });
	} catch (error) {
		console.error("[approval-workflow backfill]", error);
		return errorResponse(
			error instanceof Error ? error.message : "Backfill failed",
			500,
			{ requestId },
		);
	}
}
