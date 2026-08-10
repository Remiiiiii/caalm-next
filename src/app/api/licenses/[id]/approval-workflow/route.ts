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
import { getLicenseWorkflowForViewer } from "@/lib/approvals/LicenseApprovalWorkflowService";
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

		const { id: licenseId } = await context.params;
		if (!licenseId) {
			return errorResponse("License ID is required", 400, { requestId });
		}

		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const canView = orgId
			? await hasPermission(user.$id, PERMISSIONS.LICENSES.VIEW, orgId)
			: false;
		if (!canView) {
			return forbiddenResponse("Permission denied: view license", requestId);
		}

		const isAdminOverride = orgId
			? await hasPermission(user.$id, PERMISSIONS.APPROVALS.OVERRIDE, orgId)
			: false;

		const payload = await getLicenseWorkflowForViewer(licenseId, user.$id, {
			isAdminOverride,
		});

		return successResponse(payload, { requestId });
	} catch (error) {
		console.error("[license approval-workflow GET]", error);
		return errorResponse(
			error instanceof Error ? error.message : "Failed to load workflow",
			500,
			{ requestId },
		);
	}
}
