/**
 * Stripe webhook idempotency — process each event.id at most once.
 * Reuses the webhook_deliveries table (same pattern as GitHub webhooks).
 */

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

function deliveriesTable(): string {
	return appwriteConfig.webhookDeliveriesCollectionId || "webhook_deliveries";
}

/**
 * Claim an event for processing. Returns false if already processed.
 * On crash after claim but before finish, Stripe retries — handlers must
 * also be safe to re-run (upsert org billing from subscription snapshot).
 */
export async function claimStripeEvent(eventId: string): Promise<boolean> {
	const { tablesDB } = await createAdminClient();
	try {
		await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: deliveriesTable(),
			rowId: ID.unique(),
			data: {
				deliveryId: eventId,
				source: "stripe",
				processedAt: new Date().toISOString(),
			},
		});
		return true;
	} catch (error) {
		const existing = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: deliveriesTable(),
			queries: [
				Query.equal("deliveryId", eventId),
				Query.equal("source", "stripe"),
				Query.limit(1),
			],
		});
		if (existing.total > 0) return false;
		// Unique index may be on deliveryId alone (GitHub uses same field)
		const anySource = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: deliveriesTable(),
			queries: [Query.equal("deliveryId", eventId), Query.limit(1)],
		});
		if (anySource.total > 0) return false;
		throw error;
	}
}
