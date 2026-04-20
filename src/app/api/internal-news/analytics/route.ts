import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { listNewsArticles } from "@/lib/database/news-articles";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";

export async function GET(_request: NextRequest) {
	try {
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
		if (!userPermissions.includes(PERMISSIONS.NEWS.READ)) {
			return NextResponse.json(
				{
					success: false,
					error: "Permission denied. You need news.read permission.",
				},
				{ status: 403 },
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
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - 7);

		// Total counts
		const total = articles.length;
		const published = articles.filter((a) => a.status === "published").length;
		const drafts = articles.filter((a) => a.status === "draft").length;
		const archived = articles.filter((a) => a.status === "archived").length;

		// Time-based counts
		const thisMonth = articles.filter((a) => {
			const articleDate = new Date(a.publishedAt || a.$createdAt);
			return articleDate >= startOfMonth;
		}).length;

		const thisWeek = articles.filter((a) => {
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
					thisMonth,
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
