import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { listAcknowledgmentsForArticle } from "@/lib/database/news-acknowledgments";
import { getNewsArticle } from "@/lib/database/news-articles";
import { xlsxResponse } from "@/lib/export/xlsx-response";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.ACK_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	const articleId = request.nextUrl.searchParams.get("articleId");
	if (!articleId || !org?.orgId) {
		return NextResponse.json(
			{ error: "articleId is required" },
			{ status: 400 },
		);
	}
	const article = await getNewsArticle(articleId);
	if (!article || article.orgId !== org.orgId) {
		return NextResponse.json({ error: "Article not found" }, { status: 404 });
	}
	const rows = await listAcknowledgmentsForArticle(org.orgId, articleId);
	return xlsxResponse(`news-acks-${articleId}.xlsx`, {
		sheetName: "Acknowledgments",
		title: `News Acknowledgments — ${article.title ?? articleId}`,
		subtitle: `CAALM · ${rows.length} acknowledgment${rows.length === 1 ? "" : "s"} · Generated ${new Date().toISOString().slice(0, 10)}`,
		columns: [
			{ header: "User ID", width: 30 },
			{ header: "Article ID", width: 30 },
			{ header: "Version", type: "number", width: 10 },
			{ header: "Acknowledged at", width: 24 },
		],
		rows: rows.map((row) => [
			row.userId,
			row.articleId,
			row.articleVersion || 1,
			(row.acknowledgedAt || "").replace("T", " ").slice(0, 19),
		]),
	});
}
