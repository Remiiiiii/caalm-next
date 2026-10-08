import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { isAuthorizedCron } from "@/lib/cron/is-authorized-cron";
import { publishNewsArticle } from "@/lib/database/news-articles";
import { isEligibleForScheduledPublish } from "@/lib/news/audience";
import { logNewsAudit } from "@/lib/news/audit";

export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { tablesDB } = await createAdminClient();
		const now = new Date();
		const scheduled = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			queries: [
				Query.equal("status", ["scheduled", "draft"]),
				Query.limit(100),
			],
		});

		const results = {
			processed: 0,
			published: 0,
			failed: 0,
			errors: [] as string[],
		};

		for (const row of scheduled.rows) {
			const article = row as {
				$id: string;
				title?: string;
				status?: string;
				publishAt?: string;
				scheduledAt?: string;
				orgId?: string;
			};
			if (!isEligibleForScheduledPublish(article, now)) continue;
			results.processed += 1;
			try {
				await publishNewsArticle(article.$id, true);
				await logNewsAudit({
					action: "update",
					eventId: `news_auto_publish_${article.$id}`,
					eventTitle: `News auto-published: ${article.title || article.$id}`,
					userId: "cron",
					userName: "Scheduled publisher",
					userEmail: "",
					orgId: article.orgId,
					targetId: article.$id,
					targetLabel: article.title || article.$id,
					summary: `Cron published scheduled article ${article.title || article.$id}`,
				});
				results.published += 1;
			} catch (error: unknown) {
				results.failed += 1;
				results.errors.push(
					`Article ${article.$id}: ${error instanceof Error ? error.message : "failed"}`,
				);
			}
		}

		return NextResponse.json({
			success: true,
			results,
			timestamp: now.toISOString(),
		});
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to process scheduled articles",
			},
			{ status: 500 },
		);
	}
}
