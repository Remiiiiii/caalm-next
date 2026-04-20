import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getNewsArticle,
	publishNewsArticle,
} from "@/lib/database/news-articles";
import { getUserPermissions } from "@/lib/rbac/permissions";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		// Check authentication
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		// Check permissions
		const userPermissions = await getUserPermissions(user.$id);
		if (!userPermissions.includes(PERMISSIONS.NEWS.PUBLISH)) {
			return NextResponse.json(
				{
					success: false,
					error: "Permission denied. You need news.publish permission.",
				},
				{ status: 403 },
			);
		}

		// Check if article exists
		const article = await getNewsArticle(id);
		if (!article) {
			return NextResponse.json(
				{ success: false, error: "Article not found" },
				{ status: 404 },
			);
		}

		// Parse request body to get publish action
		const body = await request.json();
		const publish = body.publish !== undefined ? body.publish : true;

		// Validate article before publishing
		if (publish) {
			if (!article.title || article.title.trim().length === 0) {
				return NextResponse.json(
					{ success: false, error: "Cannot publish article without a title" },
					{ status: 400 },
				);
			}
			if (!article.content || article.content.trim().length === 0) {
				return NextResponse.json(
					{ success: false, error: "Cannot publish article without content" },
					{ status: 400 },
				);
			}
		}

		// Publish or unpublish article
		const updatedArticle = await publishNewsArticle(id, publish);

		return NextResponse.json({
			success: true,
			article: {
				id: updatedArticle.$id,
				title: updatedArticle.title,
				content: updatedArticle.content,
				author: updatedArticle.author,
				date: updatedArticle.$createdAt,
				type: updatedArticle.type,
				priority: updatedArticle.priority,
				department: updatedArticle.department,
				image: updatedArticle.thumbnailUrl,
				status: updatedArticle.status,
				publishedAt: updatedArticle.publishedAt,
			},
			message: publish
				? "Article published successfully"
				: "Article unpublished",
		});
	} catch (error: any) {
		console.error("Error publishing news article:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "Failed to publish news article",
			},
			{ status: 500 },
		);
	}
}
