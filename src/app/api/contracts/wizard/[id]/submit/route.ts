import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { PlanLimitError } from "@/lib/billing/planLimits";
import { requirePermission } from "@/lib/rbac/middleware";
import { resolveOrgContext } from "@/lib/templates/require-org-permission";
import {
	getWizardSession,
	parseWizardPayload,
	submitWizard,
} from "@/lib/templates/wizard.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.CREATE,
	});
	if (permissionCheck) return permissionCheck;

	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const session = await getWizardSession(id);
	if (
		!session ||
		session.orgId !== auth.orgId ||
		session.userId !== auth.user.$id
	) {
		return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const payload =
			body.payload !== undefined
				? parseWizardPayload(body.payload)
				: session.payload;
		const result = await submitWizard({
			session,
			orgId: auth.orgId,
			userId: auth.user.$id,
			userName: auth.user.fullName,
			userEmail: auth.user.email,
			payload,
		});
		return NextResponse.json({
			contractId: result.contractId,
			session: result.session,
			lineage: result.assembly.lineage,
		});
	} catch (error) {
		console.error("[contracts/wizard submit]", error);
		if (error instanceof PlanLimitError) {
			return NextResponse.json(
				{ error: error.message, code: error.code, kind: error.kind },
				{ status: 402 },
			);
		}
		const message =
			error instanceof Error ? error.message : "Failed to submit wizard";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
