import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getAuditActor } from "@/lib/audit-upload/context";
import { reconcileFindingWithReadiness } from "@/lib/audit-upload/llm-client";
import { loadReadinessItems } from "@/lib/audit-upload/readiness-adapter";
import { getFinding, updateFinding } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.MANAGE_FINDINGS,
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const { id } = await context.params;
	const finding = await getFinding(actor.orgId, id);
	if (!finding) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const readiness = await loadReadinessItems(actor.orgId);
	const reconciliation = await reconcileFindingWithReadiness({
		title: finding.title,
		description: finding.description,
		frameworkRefs: finding.frameworkRefs,
		readiness,
	});
	const updated = await updateFinding(id, { reconciliation });
	return NextResponse.json({ success: true, data: { finding: updated } });
}
