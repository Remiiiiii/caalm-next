import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { buildRetentionSummary } from "@/lib/funding";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.FUNDING.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	try {
		const summary = await buildRetentionSummary({ orgId: org.orgId });
		return NextResponse.json(summary);
	} catch (error) {
		console.error("[funding/retention GET]", error);
		return NextResponse.json(
			{ error: "Failed to load retention streams" },
			{ status: 500 },
		);
	}
}
