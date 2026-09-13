import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	errorResponse,
	forbiddenResponse,
	generateRequestId,
	unauthorizedResponse,
} from "@/lib/api/contracts/utils/response.util";
import {
	buildApprovalAuditReportPayload,
	canExportApprovalAuditReport,
	reportFileName,
} from "@/lib/approvals/approvalAuditReportPayload";
import { getLicenseWorkflowForViewer } from "@/lib/approvals/LicenseApprovalWorkflowService";
import {
	ApprovalReportRenderError,
	renderApprovalAuditPdf,
} from "@/lib/approvals/renderApprovalAuditReport";
import {
	getUserDefaultOrganization,
	hasPermission,
} from "@/lib/rbac/permissions";

export async function POST(
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

		const viewerUserId = user.accountId || user.$id;
		const isAdminOverride = orgId
			? await hasPermission(user.$id, PERMISSIONS.APPROVALS.OVERRIDE, orgId)
			: false;
		const workflow = await getLicenseWorkflowForViewer(licenseId, viewerUserId, {
			isAdminOverride,
		});
		if (!canExportApprovalAuditReport(workflow.contractStatus)) {
			return errorResponse(
				"Export is available after final approval when the item is active or pending signature",
				400,
				{ requestId },
			);
		}
		const payload = await buildApprovalAuditReportPayload(workflow, {
			entityType: "license",
			orgId,
		});
		const pdf = await renderApprovalAuditPdf(payload);
		return new NextResponse(pdf, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${reportFileName(workflow, "license")}"`,
				"X-Request-Id": requestId,
			},
		});
	} catch (error) {
		console.error("[license approval-workflow report]", error);
		const status =
			error instanceof ApprovalReportRenderError ? error.status : 500;
		return errorResponse(
			error instanceof Error ? error.message : "Failed to generate report",
			status,
			{ requestId },
		);
	}
}
