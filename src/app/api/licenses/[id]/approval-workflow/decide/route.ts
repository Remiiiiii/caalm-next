import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	decideLicense,
	getLicenseWorkflowForViewer,
} from "@/lib/approvals/LicenseApprovalWorkflowService";
import type { ApprovalDecision } from "@/lib/approvals/contractApprovalWorkflow.types";
import {
	errorResponse,
	forbiddenResponse,
	generateRequestId,
	successResponse,
	unauthorizedResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";
import {
	getUserDefaultOrganization,
	getUserRoles,
	hasPermission,
} from "@/lib/rbac/permissions";

const VALID_DECISIONS: ApprovalDecision[] = [
	"approved",
	"changes_requested",
	"rejected",
];

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const user = await getCurrentUser();
		if (!user) return unauthorizedResponse("Authentication required", requestId);

		const { id: licenseId } = await context.params;
		if (!licenseId) {
			return validationErrorResponse("License ID is required", requestId);
		}

		const body = await request.json().catch(() => ({}));
		const decision = body.decision as ApprovalDecision;
		const notes = typeof body.notes === "string" ? body.notes : undefined;
		const path =
			typeof body.path === "string" ? body.path : "/licenses/approvals";

		if (!VALID_DECISIONS.includes(decision)) {
			return validationErrorResponse("Invalid decision", requestId);
		}

		const org = await getUserDefaultOrganization(user.$id);
		const orgId = org?.orgId;
		const roles = orgId ? await getUserRoles(user.$id, orgId) : [];
		const roleNames = roles.map((r) => r.roleName || "");
		const isAdminOverride = roleNames.some(
			(name) => name === "Super Admin" || name === "Organization Admin",
		);

		const canEdit = orgId
			? await hasPermission(user.$id, PERMISSIONS.LICENSES.EDIT, orgId)
			: false;

		if (!canEdit && !isAdminOverride) {
			return forbiddenResponse(
				"Permission denied: decide license approval",
				requestId,
			);
		}

		const before = await getLicenseWorkflowForViewer(licenseId, user.$id, {
			isAdminOverride,
		});
		if (!before.canDecide && !isAdminOverride) {
			return forbiddenResponse(
				"You cannot decide the current approval step",
				requestId,
			);
		}

		const result = await decideLicense({
			licenseId,
			viewerUserId: user.$id,
			decision,
			notes,
			adminOverride: isAdminOverride && !before.canDecide,
		});

		revalidatePath(path);
		revalidatePath("/licenses");
		revalidatePath("/licenses/approvals");

		const payload = await getLicenseWorkflowForViewer(licenseId, user.$id, {
			isAdminOverride,
		});

		return successResponse(
			{ ...payload, contractStatus: result.contractStatus },
			{ requestId, message: "Decision recorded" },
		);
	} catch (error) {
		console.error("[license approval-workflow decide]", error);
		const message =
			error instanceof Error ? error.message : "Failed to record decision";
		const status =
			message.includes("not an assignee") ||
			message.includes("cannot approve") ||
			message.includes("cannot be decided") ||
			message.includes("No active approval step")
				? 403
				: message.includes("Notes are required")
					? 400
					: 500;
		return errorResponse(message, status, { requestId });
	}
}
