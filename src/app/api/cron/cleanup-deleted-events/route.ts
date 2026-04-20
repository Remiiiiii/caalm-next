import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { hardDeleteCalendarEvent } from "@/lib/actions/calendar.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function GET(request: NextRequest) {
	try {
		// Verify this is a cron job request (you might want to add authentication)
		const authHeader = request.headers.get("authorization");
		if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		console.log("Starting cleanup of deleted events older than 30 days...");

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();

		// Calculate date 30 days ago
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const cutoffDate = thirtyDaysAgo.toISOString();

		console.log("Looking for events deleted before:", cutoffDate);

		// Find events that were soft-deleted more than 30 days ago
		const response = await adminClient.tablesDB.listRows(
			appwriteConfig.databaseId,
			appwriteConfig.calendarEventsCollectionId,
			[
				Query.isNotNull("deleted_at"),
				Query.lessThan("deleted_at", cutoffDate),
				Query.limit(100), // Process in batches
			],
		);

		const eventsToCleanup = response.rows;
		console.log(`Found ${eventsToCleanup.length} events to permanently delete`);

		let successCount = 0;
		let errorCount = 0;

		for (const event of eventsToCleanup) {
			try {
				// Log the cleanup operation
				await logAuditEvent({
					event_id: event.$id,
					event_title: event.title,
					action: "delete",
					source: "caalm",
					user_id: "system",
					user_name: "System Cleanup",
					user_email: "system@caalm.com",
					status: "success",
					metadata: {
						cleanup_reason: "30_day_retention_policy",
						deleted_at: event.deleted_at,
						original_deleted_by: event.deleted_by,
					},
				});

				// Perform hard delete
				await hardDeleteCalendarEvent(event.$id);
				successCount++;

				console.log(`Permanently deleted event: ${event.title} (${event.$id})`);
			} catch (error) {
				errorCount++;
				console.error(`Failed to delete event ${event.$id}:`, error);

				// Log the cleanup failure
				await logAuditEvent({
					event_id: event.$id,
					event_title: event.title,
					action: "delete",
					source: "caalm",
					user_id: "system",
					user_name: "System Cleanup",
					user_email: "system@caalm.com",
					status: "failed",
					error_message:
						error instanceof Error ? error.message : "Unknown error",
					metadata: {
						cleanup_reason: "30_day_retention_policy",
						deleted_at: event.deleted_at,
						original_deleted_by: event.deleted_by,
					},
				});
			}
		}

		const result = {
			success: true,
			message: `Cleanup completed: ${successCount} events permanently deleted, ${errorCount} errors`,
			stats: {
				totalFound: eventsToCleanup.length,
				successCount,
				errorCount,
				cutoffDate,
			},
		};

		console.log("Cleanup completed:", result);

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in cleanup cron job:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Cleanup job failed",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
