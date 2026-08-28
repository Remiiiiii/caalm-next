import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { isPlanLimitError } from "@/lib/billing/planLimits";
import {
	applyTemplateToDraft,
	getTemplateById,
	TemplateApplyError,
} from "@/lib/contract-templates/contract-templates.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.CREATE,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const { id } = await context.params;
	const template = await getTemplateById(id);
	if (!template || template.orgId !== org.orgId) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const result = await applyTemplateToDraft({
			template,
			orgId: org.orgId,
			userId: user.$id,
			accountId: user.accountId,
			contractName:
				typeof body.contractName === "string" ? body.contractName : undefined,
		});
		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		if (error instanceof TemplateApplyError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		if (isPlanLimitError(error)) {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		console.error("[contract-templates apply]", error);
		const message =
			error instanceof Error ? error.message : "Failed to apply template";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
