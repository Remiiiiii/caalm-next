import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { catalogForRecordKind, type EvidenceRecordKind } from "./evidence-map.seed";
import { recommendEvidenceTags } from "./recommend-tags";
import {
	getTaggedRecord,
	listTagsForRecord,
	replaceTagsForRecord,
} from "./record-tags";

async function resolveOrgId(
	request: NextRequest,
	userId: string,
): Promise<string | null> {
	return (
		getOrgIdFromRequest(request) ||
		(await getUserDefaultOrganization(userId))?.orgId ||
		null
	);
}

export async function handleListEvidenceTags(
	request: NextRequest,
	kind: EvidenceRecordKind,
	recordId: string,
): Promise<NextResponse> {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const orgId = await resolveOrgId(request, user.$id);
	if (!orgId) {
		return NextResponse.json({ error: "Organization required" }, { status: 403 });
	}

	const record = await getTaggedRecord(kind, recordId, orgId);
	if (!record) {
		return NextResponse.json({ error: "Record not found" }, { status: 404 });
	}

	const tags = await listTagsForRecord(orgId, recordId, kind);
	const catalog = catalogForRecordKind(kind).map((row) => ({
		requirementId: row.requirementId,
		label: row.label,
		auditType: row.auditType,
	}));

	return NextResponse.json({
		success: true,
		data: {
			requirementIds: tags.map((tag) => tag.requirementId),
			catalog,
		},
	});
}

export async function handleReplaceEvidenceTags(
	request: NextRequest,
	kind: EvidenceRecordKind,
	recordId: string,
): Promise<NextResponse> {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const orgId = await resolveOrgId(request, user.$id);
	if (!orgId) {
		return NextResponse.json({ error: "Organization required" }, { status: 403 });
	}

	const record = await getTaggedRecord(kind, recordId, orgId);
	if (!record) {
		return NextResponse.json({ error: "Record not found" }, { status: 404 });
	}

	const body = (await request.json().catch(() => null)) as {
		requirementIds?: unknown;
	} | null;
	if (!body || !Array.isArray(body.requirementIds)) {
		return NextResponse.json(
			{ error: "requirementIds must be an array" },
			{ status: 400 },
		);
	}

	const requirementIds = body.requirementIds.filter(
		(id): id is string => typeof id === "string",
	);
	const result = await replaceTagsForRecord({
		orgId,
		recordId,
		recordKind: kind,
		requirementIds,
	});

	const userName =
		(user as { fullName?: string }).fullName || user.email || "unknown";
	await logAuditEvent({
		event_id: `evidence_tags_${kind}_${recordId}`,
		event_title: `Updated evidence tags on ${record.title}`,
		action: "update",
		source: "caalm",
		user_id: user.$id,
		user_name: userName,
		user_email: user.email || "",
		orgId,
		status: "success",
		module: kind === "license" ? "licenses" : "contracts",
		target_type: kind,
		target_id: recordId,
		target_label: record.title,
		summary: `${userName} updated evidence tags on ${record.title}`,
		changes: [
			{
				field: "requirementIds.added",
				before: null,
				after: result.added.join(", ") || null,
			},
			{
				field: "requirementIds.removed",
				before: result.removed.join(", ") || null,
				after: null,
			},
		],
		metadata: {
			added: result.added,
			removed: result.removed,
		},
	});

	return NextResponse.json({
		success: true,
		data: { requirementIds: result.requirementIds },
	});
}

export async function handleRecommendEvidenceTags(
	request: NextRequest,
	kind: EvidenceRecordKind,
	recordId: string,
): Promise<NextResponse> {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const orgId = await resolveOrgId(request, user.$id);
	if (!orgId) {
		return NextResponse.json({ error: "Organization required" }, { status: 403 });
	}

	const record = await getTaggedRecord(kind, recordId, orgId);
	if (!record) {
		return NextResponse.json({ error: "Record not found" }, { status: 404 });
	}

	const suggestions = await recommendEvidenceTags({
		kind,
		title: record.title,
		type: record.type,
		category: record.category,
		division: record.division,
		description: record.description,
		vendor: record.vendor,
	});

	return NextResponse.json({
		success: true,
		data: { suggestions },
	});
}
