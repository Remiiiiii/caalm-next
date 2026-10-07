import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getNewsFeed } from "@/lib/database/news-feeds";
import { previewNewsFeed } from "@/lib/news/ingest/run-feed";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	const { id } = await params;
	const feed = await getNewsFeed(id);
	if (!feed || feed.orgId !== org?.orgId) {
		return NextResponse.json({ error: "Feed not found" }, { status: 404 });
	}
	try {
		const items = await previewNewsFeed(id);
		return NextResponse.json({ items });
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Feed test failed",
			},
			{ status: 400 },
		);
	}
}
