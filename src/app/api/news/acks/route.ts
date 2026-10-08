import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createAcknowledgment,
	getUserAcknowledgment,
	listAcknowledgmentsForArticle,
} from "@/lib/database/news-acknowledgments";
import { getNewsArticle, listNewsArticles } from "@/lib/database/news-articles";
import { logNewsAudit } from "@/lib/news/audit";
import { isArticleVisibleToAudience } from "@/lib/news/audience";
import {
	getUserDefaultOrganization,
	getUserRoles,
} from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}
	const articleId = request.nextUrl.searchParams.get("articleId");
	if (articleId) {
		const denied = await requirePermission(request, {
			permission: PERMISSIONS.NEWS.ACK_MANAGE,
		});
		if (denied) return denied;
		const rows = await listAcknowledgmentsForArticle(org.orgId, articleId);
		return NextResponse.json({ acknowledgments: rows });
	}

	const roles = await getUserRoles(user.$id, org.orgId);
	const { articles } = await listNewsArticles({
		orgId: org.orgId,
		status: "published",
		forReader: true,
		limit: 50,
		audience: {
			department: user.department,
			roleNames: roles
				.map((role) => role.roleName)
				.filter((name): name is string => Boolean(name)),
		},
	});
	const pending = [];
	for (const article of articles) {
		if (!article.requiresAcknowledgment) continue;
		if (!isArticleVisibleToAudience(article, { department: user.department })) {
			continue;
		}
		const existing = await getUserAcknowledgment({
			orgId: org.orgId,
			userId: user.$id,
			articleId: article.$id,
		});
		if (!existing || (existing.articleVersion || 1) < (article.articleVersion || 1)) {
			pending.push({
				id: article.$id,
				title: article.title,
				ackDueAt: article.ackDueAt,
				articleVersion: article.articleVersion || 1,
			});
		}
	}
	return NextResponse.json({ pending });
}

export async function POST(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}
	const { articleId } = await request.json();
	const article = await getNewsArticle(articleId);
	if (!article || article.orgId !== org.orgId) {
		return NextResponse.json({ error: "Article not found" }, { status: 404 });
	}
	const ack = await createAcknowledgment({
		orgId: org.orgId,
		userId: user.$id,
		articleId,
		articleVersion: article.articleVersion || 1,
	});
	await logNewsAudit({
		action: "update",
		eventId: `news_ack_${articleId}_${user.$id}`,
		eventTitle: `News acknowledged: ${article.title}`,
		userId: user.$id,
		userName: user.fullName || user.email,
		userEmail: user.email,
		orgId: org.orgId,
		targetId: articleId,
		targetLabel: article.title,
		summary: `${user.fullName || user.email} acknowledged ${article.title}`,
	});
	return NextResponse.json({ acknowledgment: ack });
}
