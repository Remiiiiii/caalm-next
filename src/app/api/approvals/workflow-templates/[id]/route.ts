import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteWorkflowTemplate,
	updateWorkflowTemplate,
	type ApprovalTemplateInput,
} from "@/lib/approvals/workflowTemplates";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	const { id } = await context.params;
	const body = (await request.json()) as Partial<ApprovalTemplateInput>;
	const template = await updateWorkflowTemplate(id, body);
	return NextResponse.json({ success: true, template });
}

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	const { id } = await context.params;
	await deleteWorkflowTemplate(id);
	return NextResponse.json({ success: true });
}
