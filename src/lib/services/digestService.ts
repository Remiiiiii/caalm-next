import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { NotificationDigestQueue } from "@/lib/database/schemas/notification-digest-queue.schema";
import type { Notification } from "@/types/notifications";

class DigestService {
	private async getTablesDB() {
		const { tablesDB } = await createAdminClient();
		return tablesDB;
	}

	/**
	 * Queue a notification for digest delivery
	 */
	async queueNotificationForDigest(
		userId: string,
		notificationId: string,
		digestFrequency: "daily" | "weekly",
	): Promise<NotificationDigestQueue> {
		try {
			const tablesDB = await this.getTablesDB();
			const collectionId =
				appwriteConfig.notificationDigestQueueCollectionId ||
				"notification-digest-queue";

			if (!appwriteConfig.databaseId) {
				throw new Error("Database ID is not configured");
			}

			// Calculate scheduled send time based on frequency
			const scheduledSendAt = this.calculateScheduledSendTime(digestFrequency);

			const queueItem: Omit<NotificationDigestQueue, "$id" | "created_at"> = {
				user_id: userId,
				notification_id: notificationId,
				digest_frequency: digestFrequency,
				scheduled_send_at: scheduledSendAt.toISOString(),
				sent: false,
			};

			const response = await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId,
				tableId: collectionId,
				rowId: ID.unique(),
				data: {
					...queueItem,
					created_at: new Date().toISOString(),
				},
			});

			return response as unknown as NotificationDigestQueue;
		} catch (error) {
			console.error("Failed to queue notification for digest:", error);
			throw new Error("Failed to queue notification for digest");
		}
	}

	/**
	 * Calculate the scheduled send time based on digest frequency
	 */
	private calculateScheduledSendTime(frequency: "daily" | "weekly"): Date {
		const now = new Date();
		const scheduled = new Date(now);

		if (frequency === "daily") {
			// Schedule for next day at 9 AM (user's timezone - defaulting to UTC for now)
			scheduled.setDate(scheduled.getDate() + 1);
			scheduled.setHours(9, 0, 0, 0);
		} else if (frequency === "weekly") {
			// Schedule for next Monday at 9 AM
			const daysUntilMonday = (8 - scheduled.getDay()) % 7 || 7;
			scheduled.setDate(scheduled.getDate() + daysUntilMonday);
			scheduled.setHours(9, 0, 0, 0);
		}

		return scheduled;
	}

	/**
	 * Get all pending digest items that are ready to be sent
	 */
	async getPendingDigestItems(): Promise<NotificationDigestQueue[]> {
		try {
			const tablesDB = await this.getTablesDB();
			const collectionId =
				appwriteConfig.notificationDigestQueueCollectionId ||
				"notification-digest-queue";

			if (!appwriteConfig.databaseId) {
				throw new Error("Database ID is not configured");
			}

			const now = new Date().toISOString();

			const response = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: collectionId,
				queries: [
					Query.equal("sent", false),
					Query.lessThanEqual("scheduled_send_at", now),
					Query.orderAsc("scheduled_send_at"),
				],
			});

			return response.rows as unknown as NotificationDigestQueue[];
		} catch (error) {
			console.error("Failed to get pending digest items:", error);
			throw new Error("Failed to get pending digest items");
		}
	}

	/**
	 * Get all pending notifications for a specific user
	 */
	async getUserPendingDigestNotifications(
		userId: string,
	): Promise<Notification[]> {
		try {
			const tablesDB = await this.getTablesDB();
			const collectionId =
				appwriteConfig.notificationDigestQueueCollectionId ||
				"notification-digest-queue";

			if (!appwriteConfig.databaseId) {
				throw new Error("Database ID is not configured");
			}

			const now = new Date().toISOString();

			// Get all pending queue items for this user
			const queueItems = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: collectionId,
				queries: [
					Query.equal("user_id", userId),
					Query.equal("sent", false),
					Query.lessThanEqual("scheduled_send_at", now),
					Query.orderAsc("scheduled_send_at"),
				],
			});

			// Fetch the actual notifications (lazy import to avoid circular dependency)
			const notifications: Notification[] = [];
			for (const item of queueItems.rows as NotificationDigestQueue[]) {
				try {
					const { notificationService } = await import("./notificationService");
					const notification = await notificationService.getNotification(
						item.notification_id,
					);
					notifications.push(notification);
				} catch (error) {
					console.warn(
						`Failed to fetch notification ${item.notification_id}:`,
						error,
					);
					// Continue processing other notifications
				}
			}

			return notifications;
		} catch (error) {
			console.error("Failed to get user pending digest notifications:", error);
			throw new Error("Failed to get user pending digest notifications");
		}
	}

	/**
	 * Mark digest items as sent
	 */
	async markDigestItemsAsSent(queueItemIds: string[]): Promise<void> {
		try {
			const tablesDB = await this.getTablesDB();
			const collectionId =
				appwriteConfig.notificationDigestQueueCollectionId ||
				"notification-digest-queue";

			if (!appwriteConfig.databaseId) {
				throw new Error("Database ID is not configured");
			}

			const sentAt = new Date().toISOString();

			const updatePromises = queueItemIds.map((id) =>
				tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: collectionId,
					rowId: id,
					data: {
						sent: true,
						sent_at: sentAt,
					},
				}),
			);

			await Promise.all(updatePromises);
		} catch (error) {
			console.error("Failed to mark digest items as sent:", error);
			throw new Error("Failed to mark digest items as sent");
		}
	}

	/**
	 * Process and send all pending digests
	 */
	async processPendingDigests(): Promise<{
		processed: number;
		sent: number;
		errors: number;
	}> {
		try {
			const pendingItems = await this.getPendingDigestItems();
			const stats = {
				processed: pendingItems.length,
				sent: 0,
				errors: 0,
			};

			// Group by user_id to batch notifications per user
			const userGroups = new Map<string, NotificationDigestQueue[]>();
			for (const item of pendingItems) {
				if (!userGroups.has(item.user_id)) {
					userGroups.set(item.user_id, []);
				}
				userGroups.get(item.user_id)?.push(item);
			}

			// Process each user's digest
			for (const [userId, items] of userGroups) {
				try {
					// Get all notifications for this user's digest
					const notifications =
						await this.getUserPendingDigestNotifications(userId);

					if (notifications.length === 0) {
						// No notifications to send, but mark items as sent anyway
						await this.markDigestItemsAsSent(items.map((item) => item.$id));
						continue;
					}

					// Send digest email/notification
					// Get frequency from the first item (all items for a user have the same frequency)
					const frequency = items[0]?.digest_frequency || "daily";
					await this.sendDigestNotification(userId, notifications, frequency);

					// Mark all items as sent
					await this.markDigestItemsAsSent(items.map((item) => item.$id));
					stats.sent += items.length;
				} catch (error) {
					console.error(`Failed to process digest for user ${userId}:`, error);
					stats.errors += items.length;
				}
			}

			return stats;
		} catch (error) {
			console.error("Failed to process pending digests:", error);
			throw error;
		}
	}

	/**
	 * Send a digest notification to a user
	 */
	private async sendDigestNotification(
		userId: string,
		notifications: Notification[],
		frequency: "daily" | "weekly",
	): Promise<void> {
		try {
			const notificationCount = notifications.length;
			const frequencyText = frequency === "daily" ? "today" : "this week";

			// Group notifications by type
			const byType = new Map<string, Notification[]>();
			for (const notification of notifications) {
				if (!byType.has(notification.type)) {
					byType.set(notification.type, []);
				}
				byType.get(notification.type)?.push(notification);
			}

			// Build digest message
			let digestMessage = `You have ${notificationCount} notification${
				notificationCount > 1 ? "s" : ""
			} ${frequencyText}:\n\n`;

			for (const [type, typeNotifications] of byType) {
				digestMessage += `${typeNotifications.length} ${type} notification${
					typeNotifications.length > 1 ? "s" : ""
				}:\n`;
				for (const notification of typeNotifications.slice(0, 5)) {
					// Limit to 5 per type to keep message concise
					digestMessage += `• ${notification.title}\n`;
				}
				if (typeNotifications.length > 5) {
					digestMessage += `... and ${typeNotifications.length - 5} more\n`;
				}
				digestMessage += "\n";
			}

			// Create digest notification (lazy import to avoid circular dependency)
			const { notificationService } = await import("./notificationService");
			await notificationService.createNotification({
				userId,
				title: `Digest: ${notificationCount} notification${
					notificationCount > 1 ? "s" : ""
				} ${frequencyText}`,
				message: digestMessage.trim(),
				type: "digest",
				priority: "medium",
				metadata: {
					digestFrequency: frequency,
					notificationCount,
					notificationIds: notifications.map((n) => n.$id),
				},
			});

			console.log(
				`Digest notification sent to user ${userId} with ${notificationCount} notifications`,
			);
		} catch (error) {
			console.error("Failed to send digest notification:", error);
			throw error;
		}
	}
}

export const digestService = new DigestService();
export default digestService;
