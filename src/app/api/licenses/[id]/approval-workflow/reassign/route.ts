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
	getLicenseWorkflowForViewer,
	reassignLicenseCurrentStep,
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
			return validationErrorResponse("License ID is required", requestId);
		}

		const body = await request.json().catch(() => ({}));
		const assigneeUserIds = Array.isArray(body.assigneeUserIds)
			? body.assigneeUserIds.filter((id: unknown) => typeof id === "string")
			: [];
		const reason = typeof body.reason === "string" ? body.reason.trim() : "";
		const path =
			typeof body.path === "string" ? body.path : "/licenses/approvals";

		if (assigneeUserIds.length === 0) {
			return validationErrorResponse(
				"At least one assigneeUserId is required",
				requestId,
			);
		}
		if (reason.length < 10) {
			return validationErrorResponse(
				"A reassignment reason of at least 10 characters is required",
				requestId,
			);
		}

		const viewerUserId = user.accountId || user.$id;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const isAdminOverride = orgId
			? await hasPermission(user.$id, PERMISSIONS.APPROVALS.OVERRIDE, orgId)
			: false;

		if (!isAdminOverride) {
			return forbiddenResponse(
				"Permission denied: reassign approval step",
				requestId,
			);
		}

		await reassignLicenseCurrentStep({
			licenseId,
			viewerUserId,
			assigneeUserIds,
			reason,
			adminOverride: true,
		});

		revalidatePath(path);
		revalidatePath("/licenses");
		revalidatePath("/licenses/approvals");

		const payload = await getLicenseWorkflowForViewer(licenseId, viewerUserId, {
			isAdminOverride: true,
		});

		return successResponse(payload, {
			requestId,
			message: "Step reassigned",
		});
	} catch (error) {
		console.error("[license approval-workflow reassign]", error);
		const message =
			error instanceof Error ? error.message : "Failed to reassign step";
		const status =
			message.includes("Only Super Admin") ||
			message.includes("cannot be reassigned") ||
			message.includes("must hold the Executive") ||
			message.includes("must be Super Admin") ||
			message.includes("Permission denied")
				? 403
				: message.includes("required")
					? 400
					: 500;
		return errorResponse(message, status, { requestId });
	}
}
