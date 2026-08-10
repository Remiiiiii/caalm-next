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
	getWorkflowForViewer,
	resubmitAfterChanges,
} from "@/lib/approvals/ContractApprovalWorkflowService";
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

		const { id: contractId } = await context.params;
		if (!contractId) {
			return validationErrorResponse("Contract ID is required", requestId);
		}

		const body = await request.json().catch(() => ({}));
		const path =
			typeof body.path === "string" ? body.path : "/contracts/approvals";

		const viewerUserId = user.accountId || user.$id;
		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const roles = orgId ? await getUserRoles(viewerUserId, orgId) : [];
		const isAdminOverride = roles.some((r) => {
			const name = r.roleName || "";
			return name === "Super Admin" || name === "Organization Admin";
		});

		const result = await resubmitAfterChanges({
			contractId,
			viewerUserId,
			adminOverride: isAdminOverride,
		});

		revalidatePath(path);
		revalidatePath("/contracts");
		revalidatePath("/contracts/approvals");

		const payload = await getWorkflowForViewer(contractId, viewerUserId, {
			isAdminOverride,
		});

		return successResponse(
			{ ...payload, contractStatus: result.contractStatus },
			{ requestId, message: "Resubmitted for review" },
		);
	} catch (error) {
		console.error("[approval-workflow resubmit]", error);
		const message =
			error instanceof Error ? error.message : "Failed to resubmit";
		const status =
			message.includes("Only the uploader") ||
			message.includes("Only items with requested")
				? 403
				: 500;
		if (message.includes("Only the uploader")) {
			return forbiddenResponse(message, requestId);
		}
		return errorResponse(message, status, { requestId });
	}
}
