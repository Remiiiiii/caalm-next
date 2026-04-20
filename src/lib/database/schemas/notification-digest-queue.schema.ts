/**
 * Notification Digest Queue Schema
 * Stores queued notifications for users who have digest frequency enabled
 */

export interface NotificationDigestQueue {
	$id: string;
	user_id: string; // Links to user's $id (document ID)
	notification_id: string; // Links to the notification document
	digest_frequency: "daily" | "weekly"; // User's digest frequency setting
	scheduled_send_at: string; // ISO 8601 datetime when digest should be sent
	sent: boolean; // Whether the digest has been sent
	sent_at?: string; // ISO 8601 datetime when digest was sent
	created_at: string; // ISO 8601 datetime when queued
}

export const NOTIFICATION_DIGEST_QUEUE_ATTRIBUTES = [
	{
		key: "user_id",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "notification_id",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "digest_frequency",
		type: "enum" as const,
		elements: ["daily", "weekly"],
		required: true,
	},
	{
		key: "scheduled_send_at",
		type: "datetime" as const,
		required: true,
	},
	{
		key: "sent",
		type: "boolean" as const,
		required: true,
		default: false,
	},
	{
		key: "sent_at",
		type: "datetime" as const,
		required: false,
	},
	{
		key: "created_at",
		type: "datetime" as const,
		required: true,
	},
] as const;
