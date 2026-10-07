import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createNewsFeed,
	listNewsFeeds,
} from "@/lib/database/news-feeds";
import { logNewsAudit } from "@/lib/news/audit";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

const createSchema = z.object({
	name: z.string().trim().min(1).max(255),
	type: z.enum(["rss", "atom", "wordpress_api", "linkedin", "x"]),
	url: z.string().url().optional(),
	socialConnectionId: z.string().optional(),
	pollIntervalMinutes: z.number().int().min(15).max(1440).optional(),
	defaultDepartments: z.array(z.string()).optional(),
	enabled: z.boolean().optional(),
});

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
	const feeds = await listNewsFeeds(org.orgId);
	return NextResponse.json({ feeds });
}

export async function POST(request: NextRequest) {
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
	const parsed = createSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid feed payload" }, { status: 400 });
	}
	if (
		["rss", "atom", "wordpress_api"].includes(parsed.data.type) &&
		!parsed.data.url
	) {
		return NextResponse.json({ error: "URL is required" }, { status: 400 });
	}
	const feed = await createNewsFeed({ ...parsed.data, orgId: org.orgId });
	await logNewsAudit({
		action: "create",
		eventId: `news_feed_create_${feed.$id}`,
		eventTitle: `News feed connected: ${feed.name}`,
		userId: user.$id,
		userName: user.fullName || user.email,
		userEmail: user.email,
		orgId: org.orgId,
		targetId: feed.$id,
		targetLabel: feed.name,
		summary: `${user.fullName || user.email} connected news feed ${feed.name}`,
	});
	return NextResponse.json({ feed });
}
