import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { publishNewsArticle } from "@/lib/database/news-articles";

/**
 * Background job to publish scheduled news articles
 * Should be called by a cron job or scheduled task
 *
 * This endpoint checks for articles with scheduledAt <= now and status='draft'
 * and publishes them automatically
 */
export async function GET(request: NextRequest) {
	try {
		// Verify this is a cron request (optional - add authentication if needed)
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;

		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { tablesDB } = await createAdminClient();
		const now = new Date().toISOString();

		// Find articles that should be published
		const scheduledArticles = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			queries: [
				Query.equal("status", "draft"),
				Query.lessThanEqual("scheduledAt", now),
				Query.isNotNull("scheduledAt"),
				Query.limit(100), // Process up to 100 articles at a time
			],
		});

		const results = {
			processed: 0,
			published: 0,
			failed: 0,
			errors: [] as string[],
		};

		// Publish each scheduled article
		for (const article of scheduledArticles.rows) {
			try {
				await publishNewsArticle(article.$id, true);
				results.published++;
			} catch (error: any) {
				results.failed++;
				results.errors.push(`Article ${article.$id}: ${error.message}`);
				console.error(`Failed to publish article ${article.$id}:`, error);
			}
			results.processed++;
		}

		return NextResponse.json({
			success: true,
			message: `Processed ${results.processed} scheduled articles`,
			results,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error in publish-scheduled cron job:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "Failed to process scheduled articles",
			},
			{ status: 500 },
		);
	}
}
