import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	backfillUserOrgUnitIds,
	seedDefaultOrgUnits,
} from "@/lib/org/org-units.service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	try {
		const body = await request.json().catch(() => ({}));
		const orgId =
			body.orgId ||
			request.nextUrl.searchParams.get("orgId") ||
			request.headers.get("x-org-id");
		if (!orgId) {
			return NextResponse.json({ error: "orgId is required" }, { status: 400 });
		}
		const seed = await seedDefaultOrgUnits(orgId);
		const backfill = await backfillUserOrgUnitIds(orgId);
		return NextResponse.json({
			success: true,
			data: { seed, backfill },
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ success: false, error: message }, { status: 500 });
	}
}
