import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createNewsArticle,
	listNewsArticles,
} from "@/lib/database/news-articles";
import { createNewsVersion } from "@/lib/database/news-versions";
import { logNewsAudit } from "@/lib/news/audit";
import { toStoredPriority } from "@/lib/news/priority";
import { serializeNewsArticle } from "@/lib/news/serialize";
import {
	getUserDefaultOrganization,
	getUserPermissions,
	getUserRoles,
} from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { sanitizeNewsHtml } from "@/lib/sanitize-news-html";

const createSchema = z.object({
	title: z.string().trim().min(1).max(200),
	content: z.string().trim().min(1),
	type: z.enum(["announcement", "update", "alert", "info"]).optional(),
	priority: z.enum(["high", "medium", "low", "normal"]).optional(),
	department: z.string().optional(),
	departments: z.array(z.string()).optional(),
	roles: z.array(z.string()).optional(),
	status: z
		.enum(["draft", "published", "archived", "scheduled", "pending_review"])
		.optional(),
	thumbnailUrl: z.string().optional(),
	thumbnailPrompt: z.string().optional(),
	tags: z.array(z.string()).optional(),
	scheduledAt: z.string().optional(),
	publishAt: z.string().optional(),
	expiresAt: z.string().optional(),
	pinned: z.boolean().optional(),
	requiresAcknowledgment: z.boolean().optional(),
	ackDueAt: z.string().optional(),
	aiGenerated: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const limit = searchParams.get("limit");
		const offset = searchParams.get("offset");
		const type = searchParams.get("type");
		const priority = searchParams.get("priority");
		const department = searchParams.get("department");
		const search = searchParams.get("search");
		const status = searchParams.get("status") || "published";

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId;
		const permissions = await getUserPermissions(user.$id);
		const canReadAll = permissions.includes(PERMISSIONS.NEWS.READ);
		const forReader = status === "published" || !canReadAll;

		if (!forReader && !canReadAll) {
			return NextResponse.json(
				{ error: "Permission denied. You need news.read permission." },
				{ status: 403 },
			);
		}

		const roles = orgId ? await getUserRoles(user.$id, orgId) : [];
		const { articles, total } = await listNewsArticles({
			limit: limit ? parseInt(limit, 10) : undefined,
			offset: offset ? parseInt(offset, 10) : undefined,
			type: type || undefined,
			priority: priority || undefined,
			department: department || undefined,
			status: status === "all" ? undefined : status,
			search: search || undefined,
			orgId,
			forReader,
			audience: forReader
				? {
						department: user.department,
						roleNames: roles
							.map((role) => role.roleName)
							.filter((name): name is string => Boolean(name)),
					}
				: undefined,
		});

		const response = NextResponse.json({
			items: articles.map(serializeNewsArticle),
			total,
			limit: limit ? parseInt(limit, 10) : 9,
			offset: offset ? parseInt(offset, 10) : 0,
			viewer: {
				canCreate: permissions.includes(PERMISSIONS.NEWS.CREATE),
				canManageFeeds: permissions.includes(PERMISSIONS.NEWS.FEEDS_MANAGE),
				canApprove: permissions.includes(PERMISSIONS.NEWS.APPROVE),
			},
		});
		if (status === "published") {
			response.headers.set(
				"Cache-Control",
				"private, s-maxage=60, stale-while-revalidate=300",
			);
		}
		return response;
	} catch (error) {
		console.error("Failed to fetch internal news:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch internal news",
				items: [],
				total: 0,
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.CREATE,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const parsed = createSchema.safeParse(await request.json());
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, error: "Invalid article payload" },
				{ status: 400 },
			);
		}
		const body = parsed.data;
		const sanitizedContent = await sanitizeNewsHtml(body.content);
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId;
		if (!orgId) {
			return NextResponse.json(
				{ success: false, error: "User organization not found" },
				{ status: 400 },
			);
		}

		const permissions = await getUserPermissions(user.$id);
		const canPublish = permissions.includes(PERMISSIONS.NEWS.PUBLISH);
		let status = body.status || "draft";
		if (status === "published" && !canPublish) {
			status = "draft";
		}
		if (body.publishAt && status === "draft") {
			status = "scheduled";
		}

		const article = await createNewsArticle({
			title: body.title,
			content: sanitizedContent,
			authorId: user.$id,
			author: user.fullName || user.email || "Unknown",
			department: body.department || body.departments?.[0] || user.department || "",
			departments: body.departments || (body.department ? [body.department] : []),
			roles: body.roles || [],
			type: body.type || "info",
			priority: toStoredPriority(body.priority),
			status,
			thumbnailUrl: body.thumbnailUrl || "",
			thumbnailPrompt: body.thumbnailPrompt || "",
			tags: body.tags || [],
			scheduledAt: body.scheduledAt || body.publishAt,
			publishAt: body.publishAt || body.scheduledAt,
			expiresAt: body.expiresAt,
			pinned: body.pinned,
			requiresAcknowledgment: body.requiresAcknowledgment,
			ackDueAt: body.ackDueAt,
			aiGenerated: body.aiGenerated,
			orgId,
			source: "native",
		});

		try {
			await createNewsVersion({
				newsId: article.$id,
				content: sanitizedContent,
				modifiedBy: user.$id,
				changeDescription: "Initial version",
				orgId,
			});
		} catch (versionError) {
			console.warn("Failed to create initial version:", versionError);
		}

		await logNewsAudit({
			action: "create",
			eventId: `news_create_${article.$id}`,
			eventTitle: `News created: ${article.title}`,
			userId: user.$id,
			userName: user.fullName || user.email,
			userEmail: user.email,
			orgId,
			targetId: article.$id,
			targetLabel: article.title,
			summary: `${user.fullName || user.email} created news article ${article.title}`,
		});

		return NextResponse.json({
			success: true,
			article: serializeNewsArticle(article),
		});
	} catch (error: unknown) {
		console.error("Error creating news article:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to create news article",
			},
			{ status: 500 },
		);
	}
}
