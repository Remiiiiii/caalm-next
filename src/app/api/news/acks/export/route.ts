import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { listAcknowledgmentsForArticle } from "@/lib/database/news-acknowledgments";
import { getNewsArticle } from "@/lib/database/news-articles";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.ACK_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	const articleId = request.nextUrl.searchParams.get("articleId");
	if (!articleId || !org?.orgId) {
		return NextResponse.json({ error: "articleId is required" }, { status: 400 });
	}
	const article = await getNewsArticle(articleId);
	if (!article || article.orgId !== org.orgId) {
		return NextResponse.json({ error: "Article not found" }, { status: 404 });
	}
	const rows = await listAcknowledgmentsForArticle(org.orgId, articleId);
	const csv = [
		"userId,articleId,articleVersion,acknowledgedAt",
		...rows.map(
			(row) =>
				`${row.userId},${row.articleId},${row.articleVersion || 1},${row.acknowledgedAt}`,
		),
	].join("\n");
	return new NextResponse(csv, {
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": `attachment; filename="news-acks-${articleId}.csv"`,
		},
	});
}
