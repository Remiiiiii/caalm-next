import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	archiveTemplate,
	getTemplateById,
	isTemplateStatus,
	parseClauseSlots,
	updateTemplate,
} from "@/lib/templates/contract-template.service";
import { resolveOrgContext } from "@/lib/templates/require-org-permission";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedTemplate(id: string, orgId: string) {
	const template = await getTemplateById(id);
	if (!template || template.orgId !== orgId) return null;
	return template;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.VIEW,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const template = await loadOwnedTemplate(id, auth.orgId);
	if (!template) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}
	return NextResponse.json({ template });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.EDIT,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const template = await loadOwnedTemplate(id, auth.orgId);
	if (!template) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const updated = await updateTemplate({
			template,
			userId: auth.user.$id,
			data: {
				name: body.name !== undefined ? String(body.name) : undefined,
				description:
					body.description !== undefined ? String(body.description) : undefined,
				contractType:
					body.contractType !== undefined
						? String(body.contractType)
						: undefined,
				status: isTemplateStatus(body.status) ? body.status : undefined,
				clauseSlots:
					body.clauseSlots !== undefined
						? parseClauseSlots(body.clauseSlots)
						: undefined,
			},
		});
		return NextResponse.json({ template: updated });
	} catch (error) {
		console.error("[contract-templates PATCH]", error);
		const message =
			error instanceof Error ? error.message : "Failed to update template";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.DELETE,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const template = await loadOwnedTemplate(id, auth.orgId);
	if (!template) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}
	const archived = await archiveTemplate({
		template,
		userId: auth.user.$id,
	});
	return NextResponse.json({ template: archived });
}
