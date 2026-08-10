import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
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
	getLicenseWorkflowForViewer,
	resubmitLicenseAfterChanges,
} from "@/lib/approvals/LicenseApprovalWorkflowService";
import {
	getUserDefaultOrganization,
	getUserRoles,
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
			return validationErrorResponse("License ID is required", requestId);
		}

		const body = await request.json().catch(() => ({}));
		const path =
			typeof body.path === "string" ? body.path : "/licenses/approvals";

		const viewerUserId = user.accountId || user.$id;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const roles = orgId ? await getUserRoles(viewerUserId, orgId) : [];
		const isAdminOverride = roles.some((r) => {
			const name = r.roleName || "";
			return name === "Super Admin" || name === "Organization Admin";
		});

		const result = await resubmitLicenseAfterChanges({
			licenseId,
			viewerUserId,
			adminOverride: isAdminOverride,
		});

		revalidatePath(path);
		revalidatePath("/licenses");
		revalidatePath("/licenses/approvals");

		const payload = await getLicenseWorkflowForViewer(licenseId, viewerUserId, {
			isAdminOverride,
		});

		return successResponse(
			{ ...payload, contractStatus: result.contractStatus },
			{ requestId, message: "Resubmitted for review" },
		);
	} catch (error) {
		console.error("[license approval-workflow resubmit]", error);
		const message =
			error instanceof Error ? error.message : "Failed to resubmit";
		if (message.includes("Only the uploader")) {
			return forbiddenResponse(message, requestId);
		}
		const status = message.includes("Only items with requested") ? 403 : 500;
		return errorResponse(message, status, { requestId });
	}
}
