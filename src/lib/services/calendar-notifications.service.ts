import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "../appwrite/config";
import { notificationService } from "./notificationService";

/**
 * Calendar Event Notifications Service
 * Priority 2: Advanced notifications with configurable reminders, escalation rules, and multi-channel delivery
 */

export interface CalendarEventReminder {
	$id: string;
	eventId: string;
	userId: string;
	reminderType: "before_start" | "before_end" | "custom";
	reminderMinutes: number; // Minutes before event (e.g., 15, 30, 60, 1440 for 1 day)
	channels: NotificationChannel[];
	isSent: boolean;
	sentAt?: string;
	createdAt: string;
}

export type NotificationChannel = "in_app" | "email" | "sms" | "push";

export interface EscalationRule {
	$id: string;
	organizationId: string;
	name: string;
	triggerEvent:
		| "reminder_not_sent"
		| "event_created"
		| "event_updated"
		| "event_cancelled";
	delayMinutes: number; // Delay before escalation
	escalationChannels: NotificationChannel[];
	escalateToUserIds: string[]; // User IDs to escalate to
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateReminderData {
	eventId: string;
	userId: string;
	reminderType: "before_start" | "before_end" | "custom";
	reminderMinutes: number;
	channels: NotificationChannel[];
}

export interface CreateEscalationRuleData {
	organizationId: string;
	name: string;
	triggerEvent: EscalationRule["triggerEvent"];
	delayMinutes: number;
	escalationChannels: NotificationChannel[];
	escalateToUserIds: string[];
}

const getRemindersCollectionId = (): string => {
	const collectionId =
		process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_REMINDERS_COLLECTION ||
		"calendar_reminders";
	if (!collectionId) {
		throw new Error("Calendar reminders collection ID not configured");
	}
	return collectionId;
};

const getEscalationRulesCollectionId = (): string => {
	const collectionId =
		process.env.NEXT_PUBLIC_APPWRITE_ESCALATION_RULES_COLLECTION ||
		"escalation_rules";
	if (!collectionId) {
		throw new Error("Escalation rules collection ID not configured");
	}
	return collectionId;
};

/**
 * Create a reminder for a calendar event
 */
export const createEventReminder = async (
	data: CreateReminderData,
): Promise<CalendarEventReminder> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getRemindersCollectionId();

	const reminderId = ID.unique();

	const response = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: reminderId,
		data: {
			eventId: data.eventId,
			userId: data.userId,
			reminderType: data.reminderType,
			reminderMinutes: data.reminderMinutes,
			channels: JSON.stringify(data.channels),
			isSent: false,
			sentAt: null,
			createdAt: new Date().toISOString(),
		},
	});

	// Parse channels back from JSON
	const result = response as unknown as Record<string, unknown>;
	if (typeof result.channels === "string") {
		try {
			result.channels = JSON.parse(result.channels);
		} catch (error) {
			console.error(
				"[SERVER] createEventReminder] Error parsing channels:",
				error,
			);
			result.channels = [];
		}
	}

	return result as unknown as CalendarEventReminder;
};

/**
 * Send reminder notification through configured channels
 * Uses the existing NotificationService to create notifications in the notifications collection
 */
export const sendReminderNotification = async (
	reminder: CalendarEventReminder,
	eventTitle: string,
	eventStartDate: string,
	eventStartTime: string,
	userEmail?: string,
	userPhone?: string,
): Promise<void> => {
	const channels = reminder.channels as NotificationChannel[];

	const reminderTime = new Date(eventStartDate);
	if (eventStartTime) {
		const [hours, minutes] = eventStartTime.split(":").map(Number);
		reminderTime.setHours(hours, minutes, 0, 0);
	}
	reminderTime.setMinutes(reminderTime.getMinutes() - reminder.reminderMinutes);

	const timeString = reminderTime.toLocaleString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});

	const message = `Reminder: "${eventTitle}" starts in ${reminder.reminderMinutes} minutes (${timeString})`;

	// Always create in-app notification using the existing NotificationService
	// This ensures it appears in the notifications collection
	try {
		await notificationService.createNotification({
			userId: reminder.userId,
			title: "Event Reminder",
			message,
			type: "event_reminder",
			priority: "medium",
			actionUrl: `/calendar?eventId=${reminder.eventId}`,
			actionText: "View Event",
			metadata: {
				eventId: reminder.eventId,
				reminderId: reminder.$id,
				eventTitle,
				eventStartDate,
				eventStartTime,
			},
		});
		console.log(
			"[SERVER] sendReminderNotification] Created in-app notification",
		);
	} catch (error) {
		console.error(
			"[SERVER] sendReminderNotification] Error creating in-app notification:",
			error,
		);
	}

	// Send through additional configured channels
	for (const channel of channels) {
		try {
			switch (channel) {
				case "in_app":
					// Already handled above
					break;

				case "email":
					if (userEmail) {
						// Use mailgun service for email
						const { mailgunService } = await import("./mailgun");
						await mailgunService.sendEmail({
							to: userEmail,
							subject: `[CAALM] Event Reminder: ${eventTitle}`,
							text: message,
						});
						console.log(
							"[SERVER] sendReminderNotification] Sent email notification",
						);
					}
					break;

				case "sms":
					if (userPhone) {
						// Use notificationService to send SMS notification
						await notificationService.sendSMSNotification(reminder.userId, {
							title: "Event Reminder",
							message,
							priority: "medium",
							actionUrl: `/calendar?eventId=${reminder.eventId}`,
							type: "event_reminder",
						});
						console.log(
							"[SERVER] sendReminderNotification] Sent SMS notification",
						);
					}
					break;

				case "push":
					// Push notifications would be implemented here
					// This would typically use a push notification service
					console.log(
						"[SERVER] sendReminderNotification] Push notification not yet implemented",
					);
					break;
			}
		} catch (error) {
			console.error(
				`[SERVER] sendReminderNotification] Error sending ${channel} notification:`,
				error,
			);
			// Continue with other channels even if one fails
		}
	}

	// Mark reminder as sent
	const { tablesDB } = await createAdminClient();
	const collectionId = getRemindersCollectionId();
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: reminder.$id,
		data: {
			isSent: true,
			sentAt: new Date().toISOString(),
		},
	});
};

/**
 * Create an escalation rule
 */
export const createEscalationRule = async (
	data: CreateEscalationRuleData,
): Promise<EscalationRule> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getEscalationRulesCollectionId();

	const ruleId = ID.unique();

	const response = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: ruleId,
		data: {
			organizationId: data.organizationId,
			name: data.name,
			triggerEvent: data.triggerEvent,
			delayMinutes: data.delayMinutes,
			escalationChannels: JSON.stringify(data.escalationChannels),
			escalateToUserIds: JSON.stringify(data.escalateToUserIds),
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	});

	// Parse arrays back from JSON
	const result = response as unknown as Record<string, unknown>;
	if (typeof result.escalationChannels === "string") {
		try {
			result.escalationChannels = JSON.parse(result.escalationChannels);
		} catch (error) {
			console.error(
				"[SERVER] createEscalationRule] Error parsing escalationChannels:",
				error,
			);
			result.escalationChannels = [];
		}
	}
	if (typeof result.escalateToUserIds === "string") {
		try {
			result.escalateToUserIds = JSON.parse(result.escalateToUserIds);
		} catch (error) {
			console.error(
				"[SERVER] createEscalationRule] Error parsing escalateToUserIds:",
				error,
			);
			result.escalateToUserIds = [];
		}
	}

	return result as unknown as EscalationRule;
};

/**
 * Get active escalation rules for an organization
 */
export const getActiveEscalationRules = async (
	organizationId: string,
	triggerEvent?: EscalationRule["triggerEvent"],
): Promise<EscalationRule[]> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getEscalationRulesCollectionId();

	const queries = [
		Query.equal("organizationId", organizationId),
		Query.equal("isActive", true),
	];

	if (triggerEvent) {
		queries.push(Query.equal("triggerEvent", triggerEvent));
	}

	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries,
	});

	// Parse arrays from JSON
	const rules = response.rows.map((row) => {
		const rule = row as unknown as Record<string, unknown>;
		if (typeof rule.escalationChannels === "string") {
			try {
				rule.escalationChannels = JSON.parse(rule.escalationChannels);
			} catch (error) {
				console.error(
					"[SERVER] getActiveEscalationRules] Error parsing escalationChannels:",
					error,
				);
				rule.escalationChannels = [];
			}
		}
		if (typeof rule.escalateToUserIds === "string") {
			try {
				rule.escalateToUserIds = JSON.parse(rule.escalateToUserIds);
			} catch (error) {
				console.error(
					"[SERVER] getActiveEscalationRules] Error parsing escalateToUserIds:",
					error,
				);
				rule.escalateToUserIds = [];
			}
		}
		return rule;
	});

	return rules as unknown as EscalationRule[];
};

/**
 * Update an escalation rule
 */
export const updateEscalationRule = async (
	ruleId: string,
	updates: Partial<CreateEscalationRuleData> & { isActive?: boolean },
): Promise<EscalationRule> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getEscalationRulesCollectionId();

	const updateData: Record<string, unknown> = {
		updatedAt: new Date().toISOString(),
	};

	if (updates.name !== undefined) {
		updateData.name = updates.name;
	}
	if (updates.triggerEvent !== undefined) {
		updateData.triggerEvent = updates.triggerEvent;
	}
	if (updates.delayMinutes !== undefined) {
		updateData.delayMinutes = updates.delayMinutes;
	}
	if (updates.escalationChannels !== undefined) {
		updateData.escalationChannels = JSON.stringify(updates.escalationChannels);
	}
	if (updates.escalateToUserIds !== undefined) {
		updateData.escalateToUserIds = JSON.stringify(updates.escalateToUserIds);
	}
	if (updates.isActive !== undefined) {
		updateData.isActive = updates.isActive;
	}

	const response = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: ruleId,
		data: updateData,
	});

	// Parse arrays back from JSON
	const result = response as unknown as Record<string, unknown>;
	if (typeof result.escalationChannels === "string") {
		try {
			result.escalationChannels = JSON.parse(result.escalationChannels);
		} catch (error) {
			console.error(
				"[SERVER] updateEscalationRule] Error parsing escalationChannels:",
				error,
			);
			result.escalationChannels = [];
		}
	}
	if (typeof result.escalateToUserIds === "string") {
		try {
			result.escalateToUserIds = JSON.parse(result.escalateToUserIds);
		} catch (error) {
			console.error(
				"[SERVER] updateEscalationRule] Error parsing escalateToUserIds:",
				error,
			);
			result.escalateToUserIds = [];
		}
	}

	return result as unknown as EscalationRule;
};

/**
 * Delete an escalation rule
 */
export const deleteEscalationRule = async (ruleId: string): Promise<void> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getEscalationRulesCollectionId();

	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: ruleId,
	});
};

/**
 * Send calendar shared notification to recipient
 * Creates in-app notification, sends email, and SMS (if enabled)
 */
export const sendCalendarSharedNotification = async (
	recipientUserId: string,
	calendarName: string,
	ownerName: string,
	ownerEmail: string,
	calendarId: string,
	recipientEmail?: string,
): Promise<void> => {
	try {
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL || "https://www.caalmsolutions.com";
		const calendarUrl = `${baseUrl}/calendar?sharedCalendarId=${calendarId}`;

		const message = `${ownerName} shared the calendar "${calendarName}" with you.`;
		const emailSubject = `[CAALM] Calendar Shared: ${calendarName}`;

		// Create in-app notification
		// Try calendar_shared type first, fall back to generic types if it doesn't exist
		try {
			let notificationType = "calendar_shared";
			let typeExists =
				await notificationService.getNotificationType(notificationType);

			if (!typeExists) {
				// If calendar_shared doesn't exist, try to initialize it
				try {
					const { initializeCalendarNotificationTypes } = await import(
						"@/lib/actions/calendar-notification-types"
					);
					await initializeCalendarNotificationTypes();
					// Try again after initialization
					typeExists =
						await notificationService.getNotificationType(notificationType);
				} catch (initError) {
					console.warn(
						"[SERVER] sendCalendarSharedNotification] Failed to initialize calendar notification types:",
						initError,
					);
				}

				// If still doesn't exist after initialization, try fallback types
				if (!typeExists) {
					console.warn(
						"[SERVER] sendCalendarSharedNotification] calendar_shared type not found, trying fallback types",
					);
					const calendarType =
						await notificationService.getNotificationType("calendar");
					if (calendarType) {
						notificationType = "calendar";
						typeExists = calendarType;
					} else {
						const systemType =
							await notificationService.getNotificationType("system");
						if (systemType) {
							notificationType = "system";
							typeExists = systemType;
						}
					}
				}
			}

			// Only create notification if we have a valid type
			if (!typeExists) {
				console.error(
					"[SERVER] sendCalendarSharedNotification] No valid notification type found, skipping in-app notification",
				);
				throw new Error("No valid notification type available");
			}

			console.log(
				"[SERVER] sendCalendarSharedNotification] Attempting to create notification with type:",
				notificationType,
			);
			const createdNotification = await notificationService.createNotification({
				userId: recipientUserId,
				title: "Calendar Shared",
				message,
				type: notificationType,
				priority: "medium",
				actionUrl: calendarUrl,
				actionText: "View Calendar",
				metadata: {
					calendarId,
					calendarName,
					ownerName,
				},
			});
			console.log(
				"[SERVER] sendCalendarSharedNotification] Successfully created in-app notification:",
				createdNotification.$id,
			);
		} catch (error) {
			console.error(
				"[SERVER] sendCalendarSharedNotification] Error creating in-app notification:",
				error,
			);
			if (error instanceof Error) {
				console.error(
					"[SERVER] sendCalendarSharedNotification] Error message:",
					error.message,
				);
				console.error(
					"[SERVER] sendCalendarSharedNotification] Error stack:",
					error.stack,
				);
			}
			// Continue with other channels even if in-app fails
		}

		// Send email notification
		if (recipientEmail) {
			try {
				const { mailgunService } = await import("./mailgun");
				const _firstName = ownerName.split(" ")[0] || "User";

				const emailText = `Hello,\n\n${ownerName} shared the calendar "${calendarName}" with you.\n\nYou can now view and manage events in this shared calendar.\n\nView Calendar: ${calendarUrl}\n\nBest regards,\nCAALM Solutions Team`;

				const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">CAALM Solutions</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">I'd like to share my calendar with you</h3>
          <p style="color: #666; font-size: 16px;">${ownerName} <span style="color: #888;">(${ownerEmail})</span> shared the <strong>"${calendarName}"</strong> calendar with you in CAALM.</p>
          <p style="color: #666; font-size: 16px;">You can now view events and their details in this calendar.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${calendarUrl}" style="background-color: #078FAB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Calendar</a>
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;

				await mailgunService.sendEmail({
					to: recipientEmail,
					subject: emailSubject,
					text: emailText,
					html: emailHtml,
				});
				console.log(
					"[SERVER] sendCalendarSharedNotification] Sent email notification",
				);
			} catch (error) {
				console.error(
					"[SERVER] sendCalendarSharedNotification] Error sending email notification:",
					error,
				);
				// Continue with SMS even if email fails
			}
		}

		// Send SMS notification (if enabled)
		try {
			await notificationService.sendSMSNotification(recipientUserId, {
				title: "Calendar Shared",
				message: `${ownerName} shared the calendar "${calendarName}" with you. View it in CAALM.`,
				priority: "medium",
				actionUrl: calendarUrl,
				type: "calendar_shared",
			});
			console.log(
				"[SERVER] sendCalendarSharedNotification] Sent SMS notification",
			);
		} catch (error) {
			console.error(
				"[SERVER] sendCalendarSharedNotification] Error sending SMS notification:",
				error,
			);
			// Don't throw - SMS failure shouldn't break the operation
		}
	} catch (error) {
		console.error(
			"[SERVER] sendCalendarSharedNotification] Unexpected error:",
			error,
		);
		// Don't throw - notification failures shouldn't break calendar sharing
	}
};

export type MeetingInviteDetails = {
	eventId: string;
	title: string;
	date: string;
	startTime?: string;
	endTime?: string;
	description?: string;
	location?: string;
	organizerName: string;
	organizerEmail?: string;
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/** Pull emails from "Name <email>", "Name (email)", or bare email chunks. */
function parseParticipantEmails(participants: string): string[] {
	return participants
		.split(",")
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => {
			const angle = chunk.match(/<([^>]+)>/);
			if (angle?.[1] && EMAIL_RE.test(angle[1])) {
				return angle[1].trim().toLowerCase();
			}
			const paren = chunk.match(/\(([^)]+)\)/);
			if (paren?.[1] && EMAIL_RE.test(paren[1])) {
				return paren[1].trim().toLowerCase();
			}
			const bare = chunk.match(EMAIL_RE);
			return bare?.[0] ? bare[0].toLowerCase() : "";
		})
		.filter(Boolean);
}

/** Non-email tokens that may be user document ids or account ids. */
function parseParticipantIds(participants: string): string[] {
	return participants
		.split(",")
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => {
			if (EMAIL_RE.test(chunk) || chunk.includes("@") || chunk.includes(" ")) {
				return "";
			}
			// Appwrite ids are typically 20+ alphanumeric chars
			return /^[a-zA-Z0-9]{15,}$/.test(chunk) ? chunk : "";
		})
		.filter(Boolean);
}

async function resolveNotificationTypeKey(
	preferred: string,
	fallbacks: string[],
): Promise<string | null> {
	let typeExists = await notificationService.getNotificationType(preferred);
	if (!typeExists) {
		try {
			const { initializeCalendarNotificationTypes } = await import(
				"@/lib/actions/calendar-notification-types"
			);
			await initializeCalendarNotificationTypes();
			typeExists = await notificationService.getNotificationType(preferred);
		} catch {
			// continue to fallbacks
		}
	}
	if (typeExists) return preferred;
	for (const key of fallbacks) {
		const exists = await notificationService.getNotificationType(key);
		if (exists) return key;
	}
	return null;
}

/**
 * Notify a single invitee that they were added to a scheduled meeting.
 * In-app/SMS require a CAALM user id; email is sent whenever an address is present.
 */
export const sendMeetingInviteNotification = async (
	recipientUserId: string | undefined,
	recipientEmail: string | undefined,
	details: MeetingInviteDetails,
): Promise<void> => {
	try {
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL || "https://www.caalmsolutions.com";
		const calendarUrl = `${baseUrl}/calendar`;
		const timeRange =
			details.startTime && details.endTime
				? `${details.startTime} – ${details.endTime}`
				: details.startTime || "Time TBD";
		const agenda = details.description?.trim();
		const location = details.location?.trim();

		const messageParts = [
			`${details.organizerName} invited you to “${details.title}” on ${details.date} at ${timeRange}.`,
		];
		if (agenda) messageParts.push(`Agenda: ${agenda}`);
		if (location) messageParts.push(`Location: ${location}`);
		const message = messageParts.join(" ");

		const notificationType = await resolveNotificationTypeKey(
			"meeting_invite",
			["event_created", "calendar", "system"],
		);

		if (recipientUserId && notificationType) {
			try {
				await notificationService.createNotification({
					userId: recipientUserId,
					title: `Meeting invite: ${details.title}`,
					message,
					type: notificationType,
					priority: "medium",
					actionUrl: calendarUrl,
					actionText: "View Calendar",
					metadata: {
						eventId: details.eventId,
						title: details.title,
						date: details.date,
						startTime: details.startTime,
						endTime: details.endTime,
						description: details.description,
						location: details.location,
						organizerName: details.organizerName,
					},
				});
			} catch (error) {
				console.error(
					"[SERVER] sendMeetingInviteNotification] in-app notification failed:",
					error,
				);
			}
		}

		if (recipientEmail) {
			try {
				const { mailgunService } = await import("./mailgun");
				const emailSubject = `[CAALM] Meeting invite: ${details.title}`;
				const emailText = [
					`Hello,`,
					``,
					`${details.organizerName} invited you to a meeting in CAALM.`,
					``,
					`Title: ${details.title}`,
					`Date: ${details.date}`,
					`Time: ${timeRange}`,
					agenda ? `Agenda: ${agenda}` : null,
					location ? `Location: ${location}` : null,
					``,
					`View Calendar: ${calendarUrl}`,
					``,
					`Best regards,`,
					`CAALM Solutions Team`,
				]
					.filter((line) => line !== null)
					.join("\n");

				const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">CAALM Solutions</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">You're invited to a meeting</h3>
          <p style="color: #666; font-size: 16px;"><strong>${details.organizerName}</strong> invited you to <strong>“${details.title}”</strong>.</p>
          <ul style="color: #666; font-size: 15px; line-height: 1.6;">
            <li><strong>Date:</strong> ${details.date}</li>
            <li><strong>Time:</strong> ${timeRange}</li>
            ${agenda ? `<li><strong>Agenda:</strong> ${agenda}</li>` : ""}
            ${location ? `<li><strong>Location:</strong> ${location}</li>` : ""}
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${calendarUrl}" style="background-color: #078FAB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Calendar</a>
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;

				await mailgunService.sendEmail({
					to: recipientEmail,
					subject: emailSubject,
					text: emailText,
					html: emailHtml,
				});
			} catch (error) {
				console.error(
					"[SERVER] sendMeetingInviteNotification] email failed:",
					error,
				);
			}
		}

		if (recipientUserId) {
			try {
				await notificationService.sendSMSNotification(recipientUserId, {
					title: "Meeting invite",
					message: `${details.organizerName} invited you to “${details.title}” on ${details.date} at ${timeRange}.`,
					priority: "medium",
					actionUrl: calendarUrl,
					type: notificationType || "meeting_invite",
				});
			} catch (error) {
				console.error(
					"[SERVER] sendMeetingInviteNotification] SMS failed:",
					error,
				);
			}
		}
	} catch (error) {
		console.error(
			"[SERVER] sendMeetingInviteNotification] Unexpected error:",
			error,
		);
	}
};

type InviteRecipient = {
	email: string;
	userId?: string;
};

/**
 * Resolve participant emails/ids to recipients and notify each invitee.
 * Emails are always sent when an address is known; in-app requires a user.
 * Failures are logged and do not throw.
 */
export const notifyMeetingInvitees = async (
	participants: string | undefined,
	details: MeetingInviteDetails,
	excludeUserId?: string,
): Promise<number> => {
	if (!participants?.trim()) return 0;

	const { getUserByEmail, getUserById, getUserByAccountId } = await import(
		"@/lib/actions/user.actions"
	);

	const byEmail = new Map<string, InviteRecipient>();
	const organizerEmail = details.organizerEmail?.trim().toLowerCase();

	const addRecipient = (emailRaw: string, userId?: string) => {
		const email = emailRaw.trim().toLowerCase();
		if (!email || !EMAIL_RE.test(email)) return;
		if (organizerEmail && email === organizerEmail) return;
		const existing = byEmail.get(email);
		if (existing) {
			if (!existing.userId && userId) existing.userId = userId;
			return;
		}
		byEmail.set(email, { email, userId });
	};

	for (const email of parseParticipantEmails(participants)) {
		try {
			const user = await getUserByEmail(email);
			if (excludeUserId && user?.$id === excludeUserId) continue;
			addRecipient(user?.email || email, user?.$id);
		} catch (error) {
			console.error(
				`[SERVER] notifyMeetingInvitees] Lookup failed for ${email}:`,
				error,
			);
			addRecipient(email);
		}
	}

	for (const id of parseParticipantIds(participants)) {
		try {
			if (excludeUserId && id === excludeUserId) continue;
			let user = await getUserById(id);
			if (!user?.email) {
				user = await getUserByAccountId(id);
			}
			if (!user?.email) continue;
			if (excludeUserId && user.$id === excludeUserId) continue;
			addRecipient(String(user.email), user.$id);
		} catch (error) {
			console.error(
				`[SERVER] notifyMeetingInvitees] Id resolve failed for ${id}:`,
				error,
			);
		}
	}

	let notified = 0;
	for (const recipient of byEmail.values()) {
		try {
			await sendMeetingInviteNotification(
				recipient.userId,
				recipient.email,
				details,
			);
			notified += 1;
		} catch (error) {
			console.error(
				`[SERVER] notifyMeetingInvitees] Failed for ${recipient.email}:`,
				error,
			);
		}
	}

	return notified;
};
