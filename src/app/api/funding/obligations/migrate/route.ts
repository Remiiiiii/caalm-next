import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { migrateKeyObligationsForOrg } from "@/lib/funding";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.FUNDING.MANAGE,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	try {
		const body = await request.json().catch(() => ({}));
		const dryRun = body?.dryRun !== false;
		const stats = await migrateKeyObligationsForOrg({
			orgId: org.orgId,
			actorUserId: user.$id,
			dryRun,
		});
		return NextResponse.json(stats);
	} catch (error) {
		console.error("[funding/obligations/migrate POST]", error);
		return NextResponse.json(
			{ error: "Failed to migrate key obligations" },
			{ status: 500 },
		);
	}
}
