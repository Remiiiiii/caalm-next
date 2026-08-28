import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	createTemplate,
	isTemplateStatus,
	listTemplates,
	parseClauseSlots,
} from "@/lib/templates/contract-template.service";
import { resolveOrgContext } from "@/lib/templates/require-org-permission";

export async function GET(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.VIEW,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;

	const { searchParams } = request.nextUrl;
	const statusParam = searchParams.get("status");
	try {
		const items = await listTemplates({
			orgId: auth.orgId,
			status: isTemplateStatus(statusParam) ? statusParam : undefined,
			contractType: searchParams.get("contractType") || undefined,
			search: searchParams.get("search") || undefined,
		});
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[contract-templates GET]", error);
		return NextResponse.json(
			{ error: "Failed to list templates" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.CREATE,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;

	try {
		const body = await request.json();
		const name = String(body.name || "").trim();
		if (!name) {
			return NextResponse.json({ error: "name is required" }, { status: 400 });
		}
		const template = await createTemplate({
			orgId: auth.orgId,
			userId: auth.user.$id,
			data: {
				name,
				description: body.description ? String(body.description) : undefined,
				contractType: String(body.contractType || "").trim(),
				status: isTemplateStatus(body.status) ? body.status : "draft",
				clauseSlots: parseClauseSlots(body.clauseSlots),
			},
		});
		return NextResponse.json({ template }, { status: 201 });
	} catch (error) {
		console.error("[contract-templates POST]", error);
		const message =
			error instanceof Error ? error.message : "Failed to create template";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
