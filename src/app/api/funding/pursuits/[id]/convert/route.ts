import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { convertWonPursuitToProposal } from "@/lib/funding";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.FUNDING.MANAGE,
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

	const { id } = await context.params;

	try {
		const result = await convertWonPursuitToProposal({
			pursuitId: id,
			orgId: org.orgId,
			userId: user.$id,
		});
		return NextResponse.json(result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to convert pursuit";
		const status = message.includes("not found")
			? 404
			: message.includes("does not belong")
				? 403
				: 500;
		console.error("[funding/pursuits convert]", error);
		return NextResponse.json({ error: message }, { status });
	}
}
