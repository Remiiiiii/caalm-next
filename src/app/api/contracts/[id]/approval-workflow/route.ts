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
import { getWorkflowForViewer } from "@/lib/approvals/ContractApprovalWorkflowService";
import {
	getUserDefaultOrganization,
	getUserRoles,
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
		if (!contractId) {
			return errorResponse("Contract ID is required", 400, { requestId });
		}

		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const canView = orgId
			? await hasPermission(user.$id, PERMISSIONS.CONTRACTS.VIEW, orgId)
			: false;
		if (!canView) {
			return forbiddenResponse("Permission denied: view contract", requestId);
		}

		const roles = orgId ? await getUserRoles(user.$id, orgId) : [];
		const roleNames = roles.map((r) => r.roleName || "");
		const isAdminOverride = roleNames.some(
			(name) => name === "Super Admin" || name === "Organization Admin",
		);

		const payload = await getWorkflowForViewer(contractId, user.$id, {
			isAdminOverride,
		});

		return successResponse(payload, { requestId });
	} catch (error) {
		console.error("[approval-workflow GET]", error);
		return errorResponse(
			error instanceof Error ? error.message : "Failed to load workflow",
			500,
			{ requestId },
		);
	}
}
