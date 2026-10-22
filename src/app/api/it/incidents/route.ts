import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listActiveIncidents } from "@/lib/incidents/incident.repository";
import { requirePermission } from "@/lib/rbac/middleware";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.VIEW_INCIDENTS,
	});
	if (denied) return denied;

	const url = new URL(request.url);
	const search = url.searchParams.get("search") || undefined;
	const scale = url.searchParams.get("scale") || undefined;
	const assignedTo = url.searchParams.get("assignedTo") || undefined;

	const incidents = await listActiveIncidents({ search, scale, assignedTo });

	const now = Date.now();
	const unassigned = incidents.filter((row) => !row.assignedTo).length;
	// Approximation: sums each incident's own affected-user counter rather
	// than deduping across incidents (would need an events-table scan).
	const usersAffected24h = incidents
		.filter((row) => now - new Date(row.lastSeenAt).getTime() <= DAY_MS)
		.reduce((sum, row) => sum + row.affectedUsers, 0);
	const oldestOpenMs = incidents.length
		? Math.min(...incidents.map((row) => new Date(row.firstSeenAt).getTime()))
		: null;

	return NextResponse.json({
		success: true,
		data: {
			incidents,
			summary: {
				active: incidents.length,
				unassigned,
				usersAffected24h,
				oldestOpenMs: oldestOpenMs !== null ? now - oldestOpenMs : null,
			},
		},
	});
}
