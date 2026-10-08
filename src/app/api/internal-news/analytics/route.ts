import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { listNewsArticles } from "@/lib/database/news-articles";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.READ,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		// Get user's organization for filtering
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId;

		// Fetch all articles for analytics (filtered by organization)
		const { articles } = await listNewsArticles({
			limit: 1000, // Get all for analytics
			status: "all",
			orgId: orgId,
		});

		// Calculate statistics
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - 7);

		const TYPE_LABELS: Record<string, string> = {
			announcement: "Announcement",
			update: "Update",
			alert: "Alert",
			info: "Info",
		};

		// Total counts
		const total = articles.length;
		const publishedArticles = articles.filter((a) => a.status === "published");
		const published = publishedArticles.length;
		const drafts = articles.filter((a) => a.status === "draft").length;
		const archived = articles.filter((a) => a.status === "archived").length;
		const scheduled = articles.filter((a) => a.status === "scheduled").length;
		const pendingReview = articles.filter(
			(a) => a.status === "pending_review",
		).length;

		const categoryNameSet = new Set<string>();
		for (const article of publishedArticles) {
			if (article.tags?.length) {
				for (const tag of article.tags) {
					const trimmed = tag.trim();
					if (trimmed) categoryNameSet.add(trimmed);
				}
			} else if (article.type) {
				categoryNameSet.add(
					TYPE_LABELS[article.type] ||
						article.type.charAt(0).toUpperCase() + article.type.slice(1),
				);
			}
		}
		const categoryNames = [...categoryNameSet].sort((a, b) =>
			a.localeCompare(b),
		);
		const categories = categoryNames.length;

		// Time-based counts (published articles only — matches company-news KPIs)
		const thisMonth = publishedArticles.filter((a) => {
			const articleDate = new Date(a.publishedAt || a.$createdAt);
			return articleDate >= startOfMonth;
		}).length;

		const previousMonth = publishedArticles.filter((a) => {
			const articleDate = new Date(a.publishedAt || a.$createdAt);
			return articleDate >= startOfPrevMonth && articleDate < startOfMonth;
		}).length;

		let lastPublishedAt: string | null = null;
		for (const article of publishedArticles) {
			const raw = article.publishedAt || article.$createdAt;
			if (!raw) continue;
			if (!lastPublishedAt || new Date(raw) > new Date(lastPublishedAt)) {
				lastPublishedAt = raw;
			}
		}

		const thisWeek = publishedArticles.filter((a) => {
			const articleDate = new Date(a.publishedAt || a.$createdAt);
			return articleDate >= startOfWeek;
		}).length;

		// Articles by type
		const byType = {
			announcement: articles.filter((a) => a.type === "announcement").length,
			update: articles.filter((a) => a.type === "update").length,
			alert: articles.filter((a) => a.type === "alert").length,
			info: articles.filter((a) => a.type === "info").length,
		};

		// Articles by priority
		const byPriority = {
			high: articles.filter((a) => a.priority === "high").length,
			medium: articles.filter((a) => a.priority === "medium").length,
			low: articles.filter((a) => a.priority === "low").length,
		};

		// Total views
		const totalViews = articles.reduce((sum, a) => sum + (a.viewCount || 0), 0);
		const averageViews = total > 0 ? Math.round(totalViews / total) : 0;

		// Most viewed articles
		const mostViewed = [...articles]
			.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
			.slice(0, 10)
			.map((a) => ({
				id: a.$id,
				title: a.title,
				views: a.viewCount || 0,
				type: a.type,
				publishedAt: a.publishedAt || a.$createdAt,
			}));

		// Publishing trends (last 30 days)
		const trends = [];
		for (let i = 29; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const dayStart = new Date(date.setHours(0, 0, 0, 0));
			const dayEnd = new Date(date.setHours(23, 59, 59, 999));

			const count = articles.filter((a) => {
				const publishedAt = a.publishedAt ? new Date(a.publishedAt) : null;
				return publishedAt && publishedAt >= dayStart && publishedAt <= dayEnd;
			}).length;

			trends.push({
				date: dayStart.toISOString().split("T")[0],
				count,
			});
		}

		// Articles by department
		const byDepartment: Record<string, number> = {};
		articles.forEach((a) => {
			const dept = a.department || "Unassigned";
			byDepartment[dept] = (byDepartment[dept] || 0) + 1;
		});

		return NextResponse.json({
			success: true,
			analytics: {
				overview: {
					total,
					published,
					drafts,
					archived,
					scheduled,
					pendingReview,
					categories,
					categoryNames,
					thisMonth,
					previousMonth,
					lastPublishedAt,
					thisWeek,
				},
				byType,
				byPriority,
				byDepartment,
				engagement: {
					totalViews,
					averageViews,
					mostViewed,
				},
				trends,
			},
		});
	} catch (error: any) {
		console.error("Error fetching analytics:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "Failed to fetch analytics",
			},
			{ status: 500 },
		);
	}
}
