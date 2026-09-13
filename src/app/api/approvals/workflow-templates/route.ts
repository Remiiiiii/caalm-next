import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createWorkflowTemplate,
	listWorkflowTemplates,
	type ApprovalTemplateStepSpec,
	type ApprovalTemplateRule,
} from "@/lib/approvals/workflowTemplates";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.VIEW,
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const templates = await listWorkflowTemplates(orgId);
	return NextResponse.json({ success: true, templates });
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const body = (await request.json()) as Record<string, unknown>;
	const template = await createWorkflowTemplate({
		orgId,
		name: String(body.name || "Untitled template"),
		entityType: (body.entityType as "contract" | "license" | "both") || "both",
		rules: Array.isArray(body.rules)
			? (body.rules as ApprovalTemplateRule[])
			: [],
		steps: Array.isArray(body.steps)
			? (body.steps as ApprovalTemplateStepSpec[])
			: [],
		isDefault: Boolean(body.isDefault),
		isActive: body.isActive !== false,
	});

	return NextResponse.json({ success: true, template });
}
