import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	deleteNewsArticle,
	getNewsArticle,
	updateNewsArticle,
} from "@/lib/database/news-articles";
import { createNewsVersion } from "@/lib/database/news-versions";
import { logNewsAudit } from "@/lib/news/audit";
import { serializeNewsArticle } from "@/lib/news/serialize";
import { getUserPermissions } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { sanitizeNewsHtml } from "@/lib/sanitize-news-html";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
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
		const permissions = await getUserPermissions(user.$id);
		if (
			article.status !== "published" &&
			!permissions.includes(PERMISSIONS.NEWS.READ)
		) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		return NextResponse.json({
			success: true,
			article: serializeNewsArticle(article),
		});
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch article",
			},
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.UPDATE,
	});
	if (denied) return denied;

	try {
		const { id } = await params;
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const existingArticle = await getNewsArticle(id);
		if (!existingArticle) {
			return NextResponse.json(
				{ success: false, error: "Article not found" },
				{ status: 404 },
			);
		}
		const body = await request.json();
		let sanitizedContent = body.content;
		if (body.content !== undefined) {
			sanitizedContent = await sanitizeNewsHtml(body.content);
		}
		const bumpVersion =
			existingArticle.status === "published" &&
			existingArticle.requiresAcknowledgment &&
			body.content !== undefined &&
			body.content !== existingArticle.content;

		const article = await updateNewsArticle(id, {
			title: body.title,
			content: sanitizedContent,
			department: body.department,
			departments: body.departments,
			roles: body.roles,
			type: body.type,
			priority: body.priority,
			status: body.status,
			thumbnailUrl: body.thumbnailUrl,
			thumbnailPrompt: body.thumbnailPrompt,
			tags: body.tags,
			scheduledAt: body.scheduledAt,
			publishAt: body.publishAt || body.scheduledAt,
			expiresAt: body.expiresAt,
			pinned: body.pinned,
			requiresAcknowledgment: body.requiresAcknowledgment,
			ackDueAt: body.ackDueAt,
			articleVersion: bumpVersion
				? (existingArticle.articleVersion || 1) + 1
				: undefined,
		});

		if (body.content !== undefined && body.content !== existingArticle.content) {
			try {
				await createNewsVersion({
					newsId: id,
					content: sanitizedContent,
					modifiedBy: user.$id,
					changeDescription: body.changeDescription || "Content updated",
					orgId: existingArticle.orgId,
				});
			} catch (versionError) {
				console.warn("Failed to create version:", versionError);
			}
		}

		await logNewsAudit({
			action: "update",
			eventId: `news_update_${id}`,
			eventTitle: `News updated: ${article.title}`,
			userId: user.$id,
			userName: user.fullName || user.email,
			userEmail: user.email,
			orgId: article.orgId,
			targetId: id,
			targetLabel: article.title,
			summary: `${user.fullName || user.email} updated news article ${article.title}`,
			changes: bumpVersion
				? [
						{
							field: "articleVersion",
							before: existingArticle.articleVersion || 1,
							after: article.articleVersion,
						},
					]
				: undefined,
		});

		return NextResponse.json({
			success: true,
			article: serializeNewsArticle(article),
			requiresReAck: bumpVersion,
		});
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to update article",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.DELETE,
	});
	if (denied) return denied;
	try {
		const { id } = await params;
		const user = await getCurrentUser();
		const article = await getNewsArticle(id);
		if (!article) {
			return NextResponse.json(
				{ success: false, error: "Article not found" },
				{ status: 404 },
			);
		}
		const hardDelete = new URL(request.url).searchParams.get("hardDelete") === "true";
		await deleteNewsArticle(id, hardDelete);
		if (user) {
			await logNewsAudit({
				action: "delete",
				eventId: `news_delete_${id}`,
				eventTitle: `News deleted: ${article.title}`,
				userId: user.$id,
				userName: user.fullName || user.email,
				userEmail: user.email,
				orgId: article.orgId,
				targetId: id,
				targetLabel: article.title,
				summary: `${user.fullName || user.email} deleted news article ${article.title}`,
			});
		}
		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to delete article",
			},
			{ status: 500 },
		);
	}
}
