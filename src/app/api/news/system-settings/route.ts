import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getNewsSystemSettings,
	upsertNewsSystemSettings,
} from "@/lib/database/news-system-settings";
import { logNewsAudit } from "@/lib/news/audit";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}
	const settings = await getNewsSystemSettings(org.orgId);
	return NextResponse.json({
		settings: settings || {
			orgId: org.orgId,
			enableContractRenewal: false,
			enablePolicyUpdates: false,
			enableRegulationAlerts: false,
		},
	});
}

export async function PUT(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}
	const body = await request.json();
	const settings = await upsertNewsSystemSettings({
		orgId: org.orgId,
		enableContractRenewal: Boolean(body.enableContractRenewal),
		enablePolicyUpdates: Boolean(body.enablePolicyUpdates),
		enableRegulationAlerts: Boolean(body.enableRegulationAlerts),
	});
	await logNewsAudit({
		action: "update",
		eventId: `news_system_settings_${org.orgId}`,
		eventTitle: "News system source settings updated",
		userId: user.$id,
		userName: user.fullName || user.email,
		userEmail: user.email,
		orgId: org.orgId,
		targetId: settings.$id,
		targetLabel: "system news",
		summary: `${user.fullName || user.email} updated system news opt-in settings`,
	});
	return NextResponse.json({ settings });
}
