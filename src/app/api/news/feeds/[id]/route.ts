import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	deleteNewsFeed,
	getNewsFeed,
	updateNewsFeed,
} from "@/lib/database/news-feeds";
import { logNewsAudit } from "@/lib/news/audit";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

async function orgOwnedFeed(userId: string, id: string) {
	const org = await getUserDefaultOrganization(userId);
	if (!org?.orgId) return { error: "Organization not found" as const };
	const feed = await getNewsFeed(id);
	if (!feed || feed.orgId !== org.orgId) return { error: "Feed not found" as const };
	return { org, feed };
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { id } = await params;
	const owned = await orgOwnedFeed(user.$id, id);
	if ("error" in owned && !("feed" in owned)) {
		return NextResponse.json({ error: owned.error }, { status: 404 });
	}
	const body = await request.json();
	const feed = await updateNewsFeed(id, {
		name: body.name,
		url: body.url,
		enabled: body.enabled,
		pollIntervalMinutes: body.pollIntervalMinutes,
		defaultDepartments: body.defaultDepartments,
	});
	await logNewsAudit({
		action: "update",
		eventId: `news_feed_update_${id}`,
		eventTitle: `News feed updated: ${feed.name}`,
		userId: user.$id,
		userName: user.fullName || user.email,
		userEmail: user.email,
		orgId: feed.orgId,
		targetId: id,
		targetLabel: feed.name,
		summary: `${user.fullName || user.email} updated news feed ${feed.name}`,
	});
	return NextResponse.json({ feed });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { id } = await params;
	const owned = await orgOwnedFeed(user.$id, id);
	if ("error" in owned && !("feed" in owned)) {
		return NextResponse.json({ error: owned.error }, { status: 404 });
	}
	await deleteNewsFeed(id);
	return NextResponse.json({ success: true });
}
