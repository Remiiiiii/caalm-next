import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { listTemplates } from "@/lib/templates/contract-template.service";
import { resolveOrgContext } from "@/lib/templates/require-org-permission";
import {
	createWizardSession,
	isStartPath,
	listWizardSessions,
} from "@/lib/templates/wizard.service";

export async function GET(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.CREATE,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;

	const published = request.nextUrl.searchParams.get("publishedTemplates");
	if (published === "1") {
		const items = await listTemplates({
			orgId: auth.orgId,
			status: "published",
		});
		return NextResponse.json({ items });
	}

	const publishedClauses = request.nextUrl.searchParams.get("publishedClauses");
	if (publishedClauses === "1") {
		const { listClauses } = await import(
			"@/lib/clauses/clause-library.service"
		);
		const items = await listClauses({
			orgId: auth.orgId,
			status: "active",
			currentOnly: true,
		});
		return NextResponse.json({ items });
	}

	const sessions = await listWizardSessions({
		orgId: auth.orgId,
		userId: auth.user.$id,
	});
	return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.CREATE,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;

	try {
		const body = await request.json().catch(() => ({}));
		const session = await createWizardSession({
			orgId: auth.orgId,
			userId: auth.user.$id,
			startPath: isStartPath(body.startPath) ? body.startPath : "scratch",
			templateId: body.templateId ? String(body.templateId) : null,
		});
		return NextResponse.json({ session }, { status: 201 });
	} catch (error) {
		console.error("[contracts/wizard POST]", error);
		const message =
			error instanceof Error ? error.message : "Failed to start wizard";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
