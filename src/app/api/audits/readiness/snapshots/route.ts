import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	listReadinessSnapshots,
	parseSnapshotPayload,
} from "@/lib/audits/readiness/snapshot.service";
import type { AuditCadence } from "@/lib/audits/readiness/types";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const { searchParams } = new URL(request.url);
	const cadence = searchParams.get("cadence") as AuditCadence | null;
	const includePayload = searchParams.get("includePayload") === "1";
	const snapshotId = searchParams.get("id");

	const rows = await listReadinessSnapshots({
		orgId: defaultOrg.orgId,
		cadence: cadence || undefined,
		limit: 40,
	});

	const filtered = snapshotId
		? rows.filter((row) => row.$id === snapshotId)
		: rows;

	return NextResponse.json({
		success: true,
		data: filtered.map((row) => ({
			id: row.$id,
			cadence: row.cadence,
			score: row.score,
			ragStatus: row.ragStatus,
			timezone: row.timezone,
			createdAt: row.createdAt,
			aiSummary: row.aiSummary,
			...(includePayload
				? { payload: parseSnapshotPayload(row.payload) }
				: {}),
		})),
	});
}
