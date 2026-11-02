import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import {
	listAuditDocuments,
	listFindings,
	type AuditDocumentListScope,
} from "@/lib/audit-upload/store";
import {
	buildAuditDocumentListItems,
	deriveAuditScoreboard,
} from "@/lib/audit-upload/upload-list-summaries";
import { requirePermission } from "@/lib/rbac/middleware";

function parseScope(raw: string | null): AuditDocumentListScope {
	return raw === "removed" ? "removed" : "active";
}

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [...AUDIT_DOCUMENT_READ_PERMISSIONS],
		requireOrg: true,
	});
	if (denied) return denied;

	const scope = parseScope(request.nextUrl.searchParams.get("scope"));
	if (scope === "removed") {
		const deleteDenied = await requirePermission(request, {
			permission: PERMISSIONS.AUDIT.DELETE,
			requireOrg: true,
		});
		if (deleteDenied) return deleteDenied;
	}

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const orgId = actor.orgId;
	if (!orgId) {
		return NextResponse.json(
			{ error: "No organization on this account" },
			{ status: 400 },
		);
	}

	const [activeDocuments, scopedDocuments, findings] = await Promise.all([
		listAuditDocuments(orgId, { scope: "active" }),
		scope === "active"
			? Promise.resolve(null)
			: listAuditDocuments(orgId, { scope: "removed" }),
		listFindings({ orgId, limit: 500 }),
	]);

	const documents =
		scope === "removed" ? (scopedDocuments ?? []) : activeDocuments;
	const items = buildAuditDocumentListItems(documents, findings);
	// Org-wide band: severity + confirmed/open/repeats/questioned costs
	const scoreboard = deriveAuditScoreboard(activeDocuments, findings);

	return NextResponse.json({
		success: true,
		data: { documents: items, scoreboard, scope },
	});
}
