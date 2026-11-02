import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { inferRootCause, slaDueAt } from "@/lib/audit-upload/caps";
import { getAuditActor } from "@/lib/audit-upload/context";
import { createCap, getFinding, listCaps } from "@/lib/audit-upload/store";
import type { AuditCapStatus } from "@/lib/audit-upload/types";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.AUDIT.MANAGE_CAPS, PERMISSIONS.AUDIT.DOCUMENTS_VIEW],
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const documentId = request.nextUrl.searchParams.get("documentId") || undefined;
	const status = request.nextUrl.searchParams.get("status") as AuditCapStatus | null;
	const caps = await listCaps({
		orgId: actor.orgId,
		documentId,
		status: status || undefined,
	});
	return NextResponse.json({ success: true, data: { caps } });
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.MANAGE_CAPS,
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const body = (await request.json()) as { findingId?: string; assigneeId?: string };
	if (!body.findingId) {
		return NextResponse.json({ error: "findingId is required" }, { status: 400 });
	}
	const finding = await getFinding(actor.orgId, body.findingId);
	if (!finding) {
		return NextResponse.json({ error: "Finding not found" }, { status: 404 });
	}

	const cap = await createCap({
		orgId: actor.orgId,
		documentId: finding.documentId,
		findingId: finding.$id,
		title: `Correct: ${finding.title}`,
		rootCause: inferRootCause(`${finding.title} ${finding.description}`),
		assigneeId: body.assigneeId || null,
		status: "open",
		dueAt: slaDueAt(finding.severityComputed),
		escalationTier: 0,
		verificationEvidence: null,
		closedAt: null,
	});

	return NextResponse.json({ success: true, data: { cap } });
}
