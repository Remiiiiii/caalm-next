import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getEffectiveUser } from "@/lib/impersonation/effective-user";
import {
	countResolvedSince,
	deleteIncidents,
	listActiveIncidents,
} from "@/lib/incidents/incident.repository";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
// Suggested defaults from the spec; product owner to confirm.
const RESPONSE_TARGET_MS = HOUR_MS;

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.VIEW_INCIDENTS,
	});
	if (denied) return denied;

	const url = new URL(request.url);
	const search = url.searchParams.get("search") || undefined;
	const scale = url.searchParams.get("scale") || undefined;
	const assignedTo = url.searchParams.get("assignedTo") || undefined;

	const [incidents, effectiveUser] = await Promise.all([
		listActiveIncidents({ search, scale, assignedTo, includeResolved: true }),
		getEffectiveUser(request),
	]);
	const currentUserId = effectiveUser?.effectiveUser.$id;

	const now = Date.now();
	const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

	const activeIncidents = incidents.filter((row) => row.status !== "resolved");

	// Active breakdown
	const newCount = activeIncidents.filter((row) => row.status === "new").length;
	const acknowledgedCount = activeIncidents.filter(
		(row) => row.status === "acknowledged",
	).length;
	const reopenedCount = activeIncidents.filter(
		(row) => row.reopenedFrom,
	).length;
	const openedLastHour = activeIncidents.filter(
		(row) => now - new Date(row.firstSeenAt).getTime() <= HOUR_MS,
	).length;

	// Unassigned breakdown
	const unassignedRows = activeIncidents.filter((row) => !row.assignedTo);
	const unassigned = unassignedRows.length;
	const oldestUnassignedMs = unassignedRows.length
		? now -
			Math.min(
				...unassignedRows.map((row) => new Date(row.firstSeenAt).getTime()),
			)
		: null;
	const pastResponseTarget = unassignedRows.filter(
		(row) => now - new Date(row.firstSeenAt).getTime() > RESPONSE_TARGET_MS,
	).length;
	const pageLevelFailures = activeIncidents.filter(
		(row) => row.scale === "page",
	).length;
	const sectionOrTableFailures = activeIncidents.filter(
		(row) => row.scale === "section" || row.scale === "table",
	).length;
	const assignedToYou = currentUserId
		? activeIncidents.filter((row) => row.assignedTo === currentUserId).length
		: 0;

	// Users affected (24h) breakdown
	const recent = incidents.filter(
		(row) => now - new Date(row.lastSeenAt).getTime() <= DAY_MS,
	);
	// Approximation: sums each incident's own affected-user counter rather
	// than deduping across incidents (would need an events-table scan).
	const usersAffected24h = recent.reduce(
		(sum, row) => sum + row.affectedUsers,
		0,
	);
	const organizationsAffected24h = new Set(
		recent.map((row) => row.organizationId),
	).size;
	const totalErrorViews24h = recent.reduce(
		(sum, row) => sum + row.occurrences,
		0,
	);
	const repeatHits24h = recent.filter(
		(row) => row.occurrences > row.affectedUsers,
	).length;
	const pageCounts = new Map<string, number>();
	for (const row of recent) {
		pageCounts.set(
			row.route,
			(pageCounts.get(row.route) ?? 0) + row.occurrences,
		);
	}
	const mostAffectedPageEntry = [...pageCounts.entries()].sort(
		(a, b) => b[1] - a[1],
	)[0];
	const mostAffectedPage = mostAffectedPageEntry
		? { route: mostAffectedPageEntry[0], count: mostAffectedPageEntry[1] }
		: null;
	const orgUserCounts = new Map<string, number>();
	for (const row of recent) {
		orgUserCounts.set(
			row.organizationId,
			(orgUserCounts.get(row.organizationId) ?? 0) + row.affectedUsers,
		);
	}
	const largestOrgEntry = [...orgUserCounts.entries()].sort(
		(a, b) => b[1] - a[1],
	)[0];
	const largestOrganization = largestOrgEntry
		? {
				name: (await getOrganization(largestOrgEntry[0]))?.name ?? "Unknown",
				users: largestOrgEntry[1],
			}
		: null;

	// Oldest open breakdown
	const oldestOpenEntry = activeIncidents.length
		? activeIncidents.reduce((oldest, row) =>
				new Date(row.firstSeenAt) < new Date(oldest.firstSeenAt) ? row : oldest,
			)
		: null;
	const oldestOpenMs = oldestOpenEntry
		? now - new Date(oldestOpenEntry.firstSeenAt).getTime()
		: null;
	const ackDurations = activeIncidents
		.filter((row) => row.acknowledgedAt)
		.map(
			(row) =>
				new Date(row.acknowledgedAt as string).getTime() -
				new Date(row.firstSeenAt).getTime(),
		);
	const medianAckMs = median(ackDurations);
	const medianAgeMs = median(
		activeIncidents.map((row) => now - new Date(row.firstSeenAt).getTime()),
	);
	const openLongerThan1h = activeIncidents.filter(
		(row) => now - new Date(row.firstSeenAt).getTime() > HOUR_MS,
	).length;
	const resolvedToday = await countResolvedSince(todayStartIso);

	return NextResponse.json({
		success: true,
		data: {
			incidents,
			summary: {
				active: activeIncidents.length,
				newCount,
				acknowledgedCount,
				reopenedCount,
				openedLastHour,

				unassigned,
				oldestUnassignedMs,
				pastResponseTarget,
				pageLevelFailures,
				sectionOrTableFailures,
				assignedToYou,

				usersAffected24h,
				organizationsAffected24h,
				mostAffectedPage,
				largestOrganization,
				repeatHits24h,
				totalErrorViews24h,

				oldestOpenMs,
				oldestOpenIncident: oldestOpenEntry
					? {
							reference: oldestOpenEntry.reference,
							route: oldestOpenEntry.route,
							errorStatus: oldestOpenEntry.errorStatus,
						}
					: null,
				medianAckMs,
				medianAgeMs,
				openLongerThan1h,
				resolvedToday,
			},
		},
	});
}

const deleteSchema = z.object({
	ids: z.array(z.string()).min(1).max(50),
});

export async function DELETE(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.MANAGE_INCIDENTS,
	});
	if (denied) return denied;

	const body = await request.json().catch(() => null);
	const parsed = deleteSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	await deleteIncidents(parsed.data.ids);
	return NextResponse.json({ success: true, deleted: parsed.data.ids.length });
}
