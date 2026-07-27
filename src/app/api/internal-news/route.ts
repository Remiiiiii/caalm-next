import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createNewsArticle,
	listNewsArticles,
} from "@/lib/database/news-articles";
import { createNewsVersion } from "@/lib/database/news-versions";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { sanitizeNewsHtml } from "@/lib/sanitize-news-html";

interface NewsItem {
	id: string;
	title: string;
	content: string;
	author: string;
	date: string;
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	department?: string;
	image?: string;
	status?: "draft" | "published" | "archived";
	viewCount?: number;
	scheduledAt?: string;
}

// Mock data - in production, this would come from your database
const _mockNewsItems: NewsItem[] = [
	{
		id: "1",
		title: "Q4 Company All-Hands Meeting",
		content:
			"Join us for our quarterly all-hands meeting on Friday at 2 PM in the main conference room. We'll be discussing Q4 results, upcoming initiatives, and celebrating our achievements. This is a mandatory meeting for all employees and will include presentations from each department head, followed by a Q&A session.",
		author: "HR Department",
		date: new Date().toISOString(),
		type: "announcement",
		priority: "high",
		department: "HR",
		image: "/assets/images/genImage.png",
	},
	{
		id: "2",
		title: "New Security Protocol Update",
		content:
			"Effective immediately, all employees must use two-factor authentication for system access. This includes email, VPN, and all internal applications. Please visit the IT portal to set up your 2FA within the next 48 hours. Contact IT support if you need assistance with the setup process.",
		author: "IT Security",
		date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		type: "alert",
		priority: "high",
		department: "IT",
		image: "/assets/images/genImage.png",
	},
	{
		id: "3",
		title: "Office Holiday Schedule",
		content:
			"The office will be closed December 24-26 for the holiday break. Please plan your work accordingly and ensure all critical tasks are completed before the break. Emergency contact information will be provided to department heads. Regular operations resume on December 27th.",
		author: "Administration",
		date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
		type: "info",
		priority: "medium",
		department: "Administration",
	},
	{
		id: "4",
		title: "New Employee Onboarding",
		content:
			"Welcome to our new team members: Sarah Johnson (Marketing) and Michael Chen (Engineering). Please help them feel welcome and reach out if you have any questions. A welcome lunch will be held next Tuesday at noon in the cafeteria.",
		author: "HR Department",
		date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
		type: "update",
		priority: "low",
		department: "HR",
		image: "/assets/images/genImage.png",
	},
	{
		id: "5",
		title: "System Maintenance Window",
		content:
			"Scheduled maintenance for our internal systems will occur this Sunday from 2-4 AM. Some services may be temporarily unavailable during this time. Please save your work before the maintenance window. All systems are expected to be fully operational by 6 AM.",
		author: "IT Operations",
		date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
		type: "info",
		priority: "medium",
		department: "IT",
	},
	{
		id: "6",
		title: "Annual Performance Review Cycle Begins",
		content:
			"The annual performance review cycle has officially begun. All managers should schedule one-on-one meetings with their direct reports by the end of this month. HR will be hosting training sessions on effective performance conversations next week.",
		author: "HR Department",
		date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
		type: "announcement",
		priority: "high",
		department: "HR",
		image: "/assets/images/genImage.png",
	},
	{
		id: "7",
		title: "New Project Management Tool Rollout",
		content:
			"We're excited to announce the rollout of our new project management platform. Training sessions will be held throughout the week. The new system offers enhanced collaboration features, better reporting, and mobile access. Please attend at least one training session.",
		author: "IT Operations",
		date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
		type: "update",
		priority: "medium",
		department: "IT",
	},
	{
		id: "8",
		title: "Updated Travel Policy",
		content:
			"Please review the updated travel policy effective next month. Key changes include new booking procedures, updated per diem rates, and enhanced sustainability guidelines. All employees planning business travel should familiarize themselves with these changes.",
		author: "Administration",
		date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
		type: "info",
		priority: "medium",
		department: "Administration",
	},
	{
		id: "9",
		title: "Cybersecurity Awareness Training Required",
		content:
			"All employees must complete the mandatory cybersecurity awareness training by the end of the month. This training covers phishing detection, password security, and data protection best practices. Completion is tracked and required for compliance.",
		author: "IT Security",
		date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
		type: "alert",
		priority: "high",
		department: "IT",
	},
	{
		id: "10",
		title: "Company Picnic Save the Date",
		content:
			"Mark your calendars for our annual company picnic on July 15th at Riverside Park. This family-friendly event will feature food, games, and team-building activities. More details and RSVP information coming soon.",
		author: "HR Department",
		date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
		type: "announcement",
		priority: "low",
		department: "HR",
	},
	{
		id: "11",
		title: "Quarterly Financial Results Released",
		content:
			"Our Q3 financial results show strong performance across all divisions. Revenue increased by 15% year-over-year, and we exceeded our profitability targets. Thank you to everyone for your hard work and dedication.",
		author: "Finance Department",
		date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
		type: "update",
		priority: "medium",
		department: "Finance",
	},
	{
		id: "12",
		title: "Building Elevator Maintenance",
		content:
			"The north elevator will be out of service next Wednesday for routine maintenance. Please plan accordingly and use the south elevator or stairs. Maintenance is expected to be completed by 5 PM.",
		author: "Facilities",
		date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
		type: "info",
		priority: "low",
		department: "Facilities",
	},
];

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = searchParams.get("limit");
		const offset = searchParams.get("offset");
		const type = searchParams.get("type");
		const priority = searchParams.get("priority");
		const department = searchParams.get("department");
		const search = searchParams.get("search");
		const status = searchParams.get("status") || "published"; // Default to published for public feed

		// Get user's organization for filtering
		const user = await getCurrentUser();
		let orgId: string | undefined;
		if (user) {
			const defaultOrg = await getUserDefaultOrganization(user.$id);
			orgId = defaultOrg?.orgId;
		}

		// Fetch from database (filtered by organization)
		const { articles, total } = await listNewsArticles({
			limit: limit ? parseInt(limit, 10) : undefined,
			offset: offset ? parseInt(offset, 10) : undefined,
			type: type || undefined,
			priority: priority || undefined,
			department: department || undefined,
			status: status === "all" ? undefined : status || undefined,
			search: search || undefined,
			orgId: orgId,
		});

		// Transform to NewsItem format for compatibility
		const filteredNews: NewsItem[] = articles.map((article) => ({
			id: article.$id,
			title: article.title,
			content: article.content,
			author: article.author || "Unknown",
			date: article.publishedAt || article.$createdAt,
			type: article.type,
			priority: article.priority,
			department: article.department,
			image: article.thumbnailUrl,
			status: article.status,
			viewCount: article.viewCount,
			scheduledAt: article.scheduledAt,
		}));

		// Pagination values
		const offsetNum = offset ? parseInt(offset, 10) : 0;
		const limitNum = limit ? parseInt(limit, 10) : 9; // Default to 9 items per page

		const response = NextResponse.json({
			items: filteredNews,
			total: total,
			limit: limitNum,
			offset: offsetNum,
		});

		// Cache published articles for 5 minutes
		if (status === "published") {
			response.headers.set(
				"Cache-Control",
				"public, s-maxage=300, stale-while-revalidate=600",
			);
		}

		return response;
	} catch (error) {
		console.error("Failed to fetch internal news:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch internal news",
				details: errorMessage,
				items: [],
				total: 0,
				limit: 0,
				offset: 0,
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
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
		if (!userPermissions.includes(PERMISSIONS.NEWS.CREATE)) {
			return NextResponse.json(
				{
					success: false,
					error: "Permission denied. You need news.create permission.",
				},
				{ status: 403 },
			);
		}

		// Parse request body
		const body = await request.json();
		const {
			title,
			content,
			type,
			priority,
			department,
			status,
			thumbnailUrl,
			thumbnailPrompt,
			tags,
			scheduledAt,
			expiresAt,
		} = body;

		// Validate required fields
		if (!title || typeof title !== "string" || title.trim().length === 0) {
			return NextResponse.json(
				{ success: false, error: "Title is required" },
				{ status: 400 },
			);
		}

		if (
			!content ||
			typeof content !== "string" ||
			content.trim().length === 0
		) {
			return NextResponse.json(
				{ success: false, error: "Content is required" },
				{ status: 400 },
			);
		}

		if (title.length > 200) {
			return NextResponse.json(
				{ success: false, error: "Title too long (max 200 characters)" },
				{ status: 400 },
			);
		}

		// Sanitize HTML content
		const sanitizedContent = await sanitizeNewsHtml(content);

		// Validate type
		const validTypes = ["announcement", "update", "alert", "info"];
		if (type && !validTypes.includes(type)) {
			return NextResponse.json(
				{
					success: false,
					error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
				},
				{ status: 400 },
			);
		}

		// Validate priority
		const validPriorities = ["high", "medium", "low"];
		if (priority && !validPriorities.includes(priority)) {
			return NextResponse.json(
				{
					success: false,
					error: `Invalid priority. Must be one of: ${validPriorities.join(
						", ",
					)}`,
				},
				{ status: 400 },
			);
		}

		// Get user's organization
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId;
		if (!orgId) {
			return NextResponse.json(
				{ success: false, error: "User organization not found" },
				{ status: 400 },
			);
		}

		// Create article
		const article = await createNewsArticle({
			title: title.trim(),
			content: sanitizedContent,
			authorId: user.$id,
			author: user.fullName || user.email || "Unknown",
			department: department || user.department || "",
			type: type || "info",
			priority: priority || "medium",
			status: status || "draft",
			thumbnailUrl: thumbnailUrl || "",
			thumbnailPrompt: thumbnailPrompt || "",
			tags: Array.isArray(tags) ? tags : [],
			scheduledAt: scheduledAt || undefined,
			expiresAt: expiresAt || undefined,
			orgId: orgId,
		});

		// Create initial version entry
		try {
			await createNewsVersion({
				newsId: article.$id,
				content: sanitizedContent,
				modifiedBy: user.$id,
				changeDescription: "Initial version",
				orgId: orgId,
			});
		} catch (versionError) {
			// Log but don't fail - versioning is optional
			console.warn("Failed to create initial version:", versionError);
		}

		return NextResponse.json({
			success: true,
			article: {
				id: article.$id,
				title: article.title,
				content: article.content,
				author: article.author,
				date: article.$createdAt,
				type: article.type,
				priority: article.priority,
				department: article.department,
				image: article.thumbnailUrl,
				status: article.status,
			},
		});
	} catch (error: any) {
		console.error("Error creating news article:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "Failed to create news article",
			},
			{ status: 500 },
		);
	}
}
