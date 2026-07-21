import { type Models, Query } from "node-appwrite";
import { getValidIntegration } from "@/lib/actions/calendar-integration.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { createGraphClient } from "@/lib/microsoft/graph-client";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "./audit-logger";

interface DeletionSyncResult {
	success: boolean;
	error?: string;
	retryCount: number;
}

/**
 * Sync deletion to Outlook with retry logic
 */
export async function syncDeletionToOutlook(
	eventId: string,
	maxRetries: number = 3,
): Promise<DeletionSyncResult> {
	let retryCount = 0;
	let lastError: string | undefined;
	let event: Models.DefaultRow | undefined;

	while (retryCount < maxRetries) {
		try {
			// Get the event details
			const adminClient = await createAdminClient();
			event = await adminClient.tablesDB.getRow<Models.DefaultRow>({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.calendarEventsCollectionId!,
				rowId: eventId,
			});

			if (!event.outlook_id) {
				// No Outlook ID means it was never synced, mark as successfully deleted
				// No need to log audit event - the main deletion already logged it
				await adminClient.tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.calendarEventsCollectionId!,
					rowId: eventId,
					data: {
						deletion_status: "deleted_from_outlook",
						deletion_synced: true,
					},
				});

				return { success: true, retryCount };
			}

			// Get user integration for Microsoft Graph access
			const integration = await getValidIntegration(
				event.createdBy,
				"microsoft",
			);

			if (!integration) {
				// No Microsoft integration, mark as successfully deleted
				// No need to log audit event - the main deletion already logged it
				await adminClient.tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.calendarEventsCollectionId!,
					rowId: eventId,
					data: {
						deletion_status: "deleted_from_outlook",
						deletion_synced: true,
					},
				});

				return { success: true, retryCount };
			}

			// Create Graph client and delete from Outlook
			const graphClient = createGraphClient(
				integration.access_token,
				integration.refresh_token,
				new Date(integration.token_expiry),
			);

			await graphClient.deleteEvent(event.outlook_id);

			// Successfully deleted from Outlook
			await adminClient.tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.calendarEventsCollectionId!,
				rowId: eventId,
				data: {
					deletion_status: "deleted_from_outlook",
					deletion_synced: true,
				},
			});

			// Get orgId for audit logging
			let orgId: string | undefined;
			try {
				if (event.deleted_by) {
					const { getUserByAccountId } = await import(
						"@/lib/actions/user.actions"
					);
					const user = await getUserByAccountId(event.deleted_by);
					if (user?.$id) {
						const defaultOrg = await getUserDefaultOrganization(user.$id);
						orgId = defaultOrg?.orgId;
					}
				}
			} catch (error) {
				console.warn("Could not get orgId for sync_delete audit:", error);
			}

			await logAuditEvent({
				event_id: eventId,
				event_title: event.title,
				action: "sync_delete",
				source: "caalm",
				user_id: event.deleted_by || "system",
				user_name: "System",
				user_email: "system@caalm.com",
				orgId: orgId || "default_organization",
				status: "success",
				metadata: { retryCount },
			});

			return { success: true, retryCount };
		} catch (error) {
			lastError = error instanceof Error ? error.message : "Unknown error";
			retryCount++;

			// Get orgId for audit logging
			let orgId: string | undefined;
			try {
				if (event?.deleted_by) {
					const { getUserByAccountId } = await import(
						"@/lib/actions/user.actions"
					);
					const user = await getUserByAccountId(event.deleted_by);
					if (user?.$id) {
						const defaultOrg = await getUserDefaultOrganization(user.$id);
						orgId = defaultOrg?.orgId;
					}
				}
			} catch (error) {
				console.warn("Could not get orgId for sync_delete audit:", error);
			}

			// Log the error
			await logAuditEvent({
				event_id: eventId,
				event_title: event?.title || "Unknown",
				action: "sync_delete",
				source: "caalm",
				user_id: event?.deleted_by || "system",
				user_name: "System",
				user_email: "system@caalm.com",
				orgId: orgId || "default_organization",
				status: "failed",
				error_message: lastError,
				metadata: { retryCount, attempt: retryCount },
			});

			if (retryCount < maxRetries) {
				const delayMs = 2 ** retryCount * 1000;
				console.log(
					`Retrying deletion sync in ${delayMs}ms (attempt ${
						retryCount + 1
					}/${maxRetries})`,
				);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}

	// All retries failed
	const adminClient = await createAdminClient();
	await adminClient.tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.calendarEventsCollectionId!,
		rowId: eventId,
		data: {
			deletion_status: "deletion_failed",
			deletion_synced: false,
		},
	});

	return { success: false, error: lastError, retryCount };
}

/**
 * Retry all failed deletions
 */
export async function retryFailedDeletions(): Promise<{
	processed: number;
	successful: number;
	failed: number;
}> {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();

		// Find all events with failed deletion status
		const response = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			queries: [
				Query.equal("deletion_status", "deletion_failed"),
				Query.isNotNull("deleted_at"),
				Query.limit(50), // Process in batches
			],
		});

		const failedEvents = response.rows;
		let successful = 0;
		let failed = 0;

		console.log(`Found ${failedEvents.length} failed deletions to retry`);

		for (const event of failedEvents) {
			const result = await syncDeletionToOutlook(event.$id, 2); // Reduced retries for batch processing

			if (result.success) {
				successful++;
			} else {
				failed++;
			}
		}

		return {
			processed: failedEvents.length,
			successful,
			failed,
		};
	} catch (error) {
		console.error("Error retrying failed deletions:", error);
		throw error;
	}
}

/**
 * Get events that need deletion sync
 */
export async function getPendingDeletionSyncs(): Promise<any[]> {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();

		const response = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			queries: [
				Query.equal("deletion_status", "pending_outlook_deletion"),
				Query.isNotNull("deleted_at"),
				Query.orderAsc("deleted_at"),
				Query.limit(100),
			],
		});

		return response.rows;
	} catch (error) {
		console.error("Error fetching pending deletion syncs:", error);
		throw error;
	}
}

/**
 * Process pending deletion syncs (to be called by cron job)
 */
export async function processPendingDeletionSyncs(): Promise<void> {
	try {
		const pendingEvents = await getPendingDeletionSyncs();

		console.log(`Processing ${pendingEvents.length} pending deletion syncs`);

		for (const event of pendingEvents) {
			await syncDeletionToOutlook(event.$id, 3);
		}
	} catch (error) {
		console.error("Error processing pending deletion syncs:", error);
	}
}
