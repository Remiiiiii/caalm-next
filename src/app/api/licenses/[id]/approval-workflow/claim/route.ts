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
	claimLicenseCurrentStep,
	getLicenseWorkflowForViewer,
} from "@/lib/approvals/LicenseApprovalWorkflowService";
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

		const { id: licenseId } = await context.params;
		if (!licenseId) {
			return errorResponse("License ID is required", 400, { requestId });
		}

		const body = await request.json().catch(() => ({}));
		const path =
			typeof body.path === "string" ? body.path : "/licenses/approvals";

		const viewerUserId = user.accountId || user.$id;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const canEdit = orgId
			? await hasPermission(user.$id, PERMISSIONS.LICENSES.EDIT, orgId)
			: false;
		const canApprove = orgId
			? await hasPermission(user.$id, PERMISSIONS.LICENSES.APPROVE, orgId)
			: false;
		if (!canEdit && !canApprove) {
			return forbiddenResponse(
				"Permission denied: claim approval step",
				requestId,
			);
		}

		const before = await getLicenseWorkflowForViewer(licenseId, viewerUserId);
		if (!before.canClaimStep) {
			return forbiddenResponse(
				before.decisionBlockReason || "You cannot claim this step",
				requestId,
			);
		}

		await claimLicenseCurrentStep({ licenseId, viewerUserId });
		revalidatePath(path);
		revalidatePath("/licenses");
		revalidatePath("/licenses/approvals");

		const isAdminOverride = orgId
			? await hasPermission(user.$id, PERMISSIONS.APPROVALS.OVERRIDE, orgId)
			: false;
		const payload = await getLicenseWorkflowForViewer(licenseId, viewerUserId, {
			isAdminOverride,
		});
		return successResponse(payload, { requestId, message: "Step claimed" });
	} catch (error) {
		console.error("[license approval-workflow claim]", error);
		const message =
			error instanceof Error ? error.message : "Failed to claim step";
		return errorResponse(message, message.includes("already") ? 400 : 500, {
			requestId,
		});
	}
}
