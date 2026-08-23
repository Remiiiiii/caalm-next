/**
 * Appwrite table attribute guide for calendar reminders and escalation.
 * Create tables with alphanumeric $id values (see appwriteConfig + .env.example).
 */

export const CALENDAR_REMINDERS_SCHEMA = {
	name: "calendar_reminders",
	attributes: [
		{ key: "eventId", type: "string", size: 64, required: true },
		{ key: "userId", type: "string", size: 64, required: true },
		{
			key: "reminderType",
			type: "string",
			size: 32,
			required: true,
			elements: ["before_start", "before_end", "custom"],
		},
		{ key: "reminderMinutes", type: "integer", required: true },
		{ key: "channels", type: "string", size: 512, required: true },
		{ key: "isSent", type: "boolean", required: true },
		{ key: "sentAt", type: "datetime", required: false },
		{ key: "escalatedAt", type: "datetime", required: false },
		{ key: "createdAt", type: "datetime", required: true },
	],
	indexes: [
		{
			key: "idx_reminder_sent",
			type: "key",
			attributes: ["isSent"],
			orders: ["ASC"],
		},
		{
			key: "idx_reminder_event",
			type: "key",
			attributes: ["eventId"],
			orders: ["ASC"],
		},
		{
			key: "idx_reminder_user",
			type: "key",
			attributes: ["userId"],
			orders: ["ASC"],
		},
	],
} as const;

export const ESCALATION_RULES_SCHEMA = {
	name: "escalation_rules",
	attributes: [
		{ key: "organizationId", type: "string", size: 64, required: true },
		{ key: "name", type: "string", size: 256, required: true },
		{
			key: "triggerEvent",
			type: "string",
			size: 32,
			required: true,
			elements: [
				"reminder_not_sent",
				"event_created",
				"event_updated",
				"event_cancelled",
			],
		},
		{ key: "delayMinutes", type: "integer", required: true },
		{ key: "escalationChannels", type: "string", size: 512, required: true },
		{ key: "escalateToUserIds", type: "string", size: 2048, required: true },
		{ key: "isActive", type: "boolean", required: true },
		{ key: "createdAt", type: "datetime", required: true },
		{ key: "updatedAt", type: "datetime", required: true },
	],
	indexes: [
		{
			key: "idx_rule_org_active",
			type: "key",
			attributes: ["organizationId", "isActive"],
			orders: ["ASC", "ASC"],
		},
		{
			key: "idx_rule_trigger",
			type: "key",
			attributes: ["triggerEvent"],
			orders: ["ASC"],
		},
	],
} as const;

export const ESCALATION_JOBS_SCHEMA = {
	name: "escalation_jobs",
	attributes: [
		{ key: "organizationId", type: "string", size: 64, required: true },
		{ key: "ruleId", type: "string", size: 64, required: true },
		{
			key: "triggerEvent",
			type: "string",
			size: 32,
			required: true,
			elements: [
				"reminder_not_sent",
				"event_created",
				"event_updated",
				"event_cancelled",
			],
		},
		{ key: "eventId", type: "string", size: 64, required: true },
		{ key: "reminderId", type: "string", size: 64, required: false },
		{ key: "triggerAt", type: "datetime", required: true },
		{ key: "isSent", type: "boolean", required: true },
		{ key: "sentAt", type: "datetime", required: false },
		{ key: "createdAt", type: "datetime", required: true },
	],
	indexes: [
		{
			key: "idx_job_sent_trigger",
			type: "key",
			attributes: ["isSent", "triggerAt"],
			orders: ["ASC", "ASC"],
		},
		{
			key: "idx_job_rule_event_trigger",
			type: "unique",
			attributes: ["ruleId", "eventId", "triggerEvent"],
			orders: ["ASC", "ASC", "ASC"],
		},
	],
} as const;
