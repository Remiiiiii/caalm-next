import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getNewsArticle,
	publishNewsArticle,
} from "@/lib/database/news-articles";
import { logNewsAudit } from "@/lib/news/audit";
import { serializeNewsArticle } from "@/lib/news/serialize";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.PUBLISH,
	});
	if (denied) return denied;

	try {
		const { id } = await params;
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const article = await getNewsArticle(id);
		if (!article) {
			return NextResponse.json(
				{ success: false, error: "Article not found" },
				{ status: 404 },
			);
		}
		const body = await request.json().catch(() => ({ publish: true }));
		const publish = body.publish !== undefined ? body.publish : true;
		if (publish && (!article.title.trim() || !article.content.trim())) {
			return NextResponse.json(
				{ success: false, error: "Cannot publish an empty article" },
				{ status: 400 },
			);
		}
		const updated = await publishNewsArticle(id, publish);
		await logNewsAudit({
			action: "update",
			eventId: `news_${publish ? "publish" : "unpublish"}_${id}`,
			eventTitle: `News ${publish ? "published" : "unpublished"}: ${updated.title}`,
			userId: user.$id,
			userName: user.fullName || user.email,
			userEmail: user.email,
			orgId: updated.orgId,
			targetId: id,
			targetLabel: updated.title,
			summary: `${user.fullName || user.email} ${publish ? "published" : "unpublished"} ${updated.title}`,
		});
		return NextResponse.json({
			success: true,
			article: serializeNewsArticle(updated),
		});
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to publish article",
			},
			{ status: 500 },
		);
	}
}
