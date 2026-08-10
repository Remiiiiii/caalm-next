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
	reassignLicenseCurrentStep,
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
		const assigneeUserIds = Array.isArray(body.assigneeUserIds)
			? body.assigneeUserIds.filter((id: unknown) => typeof id === "string")
			: [];
		const path =
			typeof body.path === "string" ? body.path : "/licenses/approvals";

		if (assigneeUserIds.length === 0) {
			return validationErrorResponse(
				"At least one assigneeUserId is required",
				requestId,
			);
		}

		const viewerUserId = user.accountId || user.$id;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const roles = orgId ? await getUserRoles(viewerUserId, orgId) : [];
		const isAdminOverride = roles.some((r) => {
			const name = r.roleName || "";
			return name === "Super Admin" || name === "Organization Admin";
		});

		if (!isAdminOverride) {
			return forbiddenResponse(
				"Only Super Admin or Organization Admin can reassign",
				requestId,
			);
		}

		await reassignLicenseCurrentStep({
			licenseId,
			viewerUserId,
			assigneeUserIds,
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
			message.includes("must be Super Admin")
				? 403
				: message.includes("required")
					? 400
					: 500;
		return errorResponse(message, status, { requestId });
	}
}
