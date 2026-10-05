import { type NextRequest, NextResponse } from "next/server";
import { requireITHubFleetContext } from "@/lib/it/require-it-hub-org";
import {
	buildOrgITSnapshot,
	toFleetRow,
	type OrgITFleetRow,
} from "@/lib/it/org-it-snapshot";
import { listOrganizations } from "@/lib/rbac/organizations";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
	const ctx = await requireITHubFleetContext(request);
	if (!ctx.ok) return ctx.response;

	const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
	const page = Math.max(
		1,
		Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10) || 1,
	);

	try {
		const payload = await CacheManager.withCache(
			"it/hub-fleet",
			CACHE_KEYS.it.hubFleet(page, q),
			async () => {
				const orgs = await listOrganizations();
				const filtered = orgs.filter((org) => {
					if (!q) return true;
					return (
						org.name.toLowerCase().includes(q) ||
						org.$id.toLowerCase().includes(q)
					);
				});
				const total = filtered.length;
				const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
				const rows: OrgITFleetRow[] = [];
				for (const org of slice) {
					const snapshot = await CacheManager.withCache(
						"it/hub-snapshot",
						CACHE_KEYS.it.hubSnapshot(org.$id),
						() => buildOrgITSnapshot(org.$id),
						60,
					);
					rows.push(toFleetRow(snapshot));
				}
				return { rows, total, page, pageSize: PAGE_SIZE };
			},
			60,
		);

		return NextResponse.json({ success: true, data: payload });
	} catch (error) {
		console.error("[IT hub fleet]", error);
		return NextResponse.json(
			{ error: "Failed to load tenant fleet" },
			{ status: 500 },
		);
	}
}
