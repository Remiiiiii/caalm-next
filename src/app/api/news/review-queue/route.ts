import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getNewsArticle,
	listNewsArticles,
	publishNewsArticle,
	updateNewsArticle,
} from "@/lib/database/news-articles";
import { dismissFeedItem } from "@/lib/database/news-feed-dismissals";
import { logNewsAudit } from "@/lib/news/audit";
import { serializeNewsArticle } from "@/lib/news/serialize";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.APPROVE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	const { articles, total } = await listNewsArticles({
		orgId: org?.orgId,
		status: "pending_review",
		limit: 50,
	});
	return NextResponse.json({ items: articles.map(serializeNewsArticle), total });
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.APPROVE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	const body = await request.json();
	const ids: string[] = Array.isArray(body.ids) ? body.ids : [body.id];
	const action: "approve" | "draft" | "dismiss" = body.action;
	if (!ids.length || !action) {
		return NextResponse.json({ error: "id and action are required" }, { status: 400 });
	}

	const results: string[] = [];
	for (const id of ids.filter(Boolean)) {
		const article = await getNewsArticle(id);
		if (!article || article.orgId !== org?.orgId) continue;
		if (action === "dismiss") {
			if (article.sourceFeedId && article.externalId) {
				await dismissFeedItem({
					orgId: article.orgId || org.orgId,
					sourceFeedId: article.sourceFeedId,
					externalId: article.externalId,
					dismissedBy: user.$id,
				});
			}
			await updateNewsArticle(id, { status: "archived" });
		} else if (action === "approve") {
			await updateNewsArticle(id, { approvedBy: user.$id });
			await publishNewsArticle(id, true);
		} else {
			await updateNewsArticle(id, { status: "draft", approvedBy: user.$id });
		}
		results.push(id);
		await logNewsAudit({
			action: "update",
			eventId: `news_review_${action}_${id}`,
			eventTitle: `News ${action}: ${article.title}`,
			userId: user.$id,
			userName: user.fullName || user.email,
			userEmail: user.email,
			orgId: article.orgId,
			targetId: id,
			targetLabel: article.title,
			summary: `${user.fullName || user.email} ${action} review item ${article.title}`,
		});
	}
	return NextResponse.json({ success: true, ids: results });
}
