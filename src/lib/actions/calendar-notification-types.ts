import { NotificationService } from "@/lib/services/notificationService";

/**
 * Initialize calendar-specific notification types
 * Priority 2: Advanced notifications
 *
 * This should be called during app initialization or migration
 */
export async function initializeCalendarNotificationTypes(): Promise<void> {
	const notificationService = new NotificationService();

	const calendarNotificationTypes = [
		{
			type_key: "event_reminder",
			label: "Event Reminder",
			icon: "calendar",
			color_classes: "text-blue-600",
			bg_color_classes: "bg-blue-50",
			priority: "medium" as const,
			enabled: true,
			description: "Reminders for upcoming calendar events",
		},
		{
			type_key: "event_created",
			label: "Event Created",
			icon: "plus-circle",
			color_classes: "text-green-600",
			bg_color_classes: "bg-green-50",
			priority: "low" as const,
			enabled: true,
			description: "Notification when a new calendar event is created",
		},
		{
			type_key: "event_updated",
			label: "Event Updated",
			icon: "edit",
			color_classes: "text-yellow-600",
			bg_color_classes: "bg-yellow-50",
			priority: "medium" as const,
			enabled: true,
			description: "Notification when a calendar event is updated",
		},
		{
			type_key: "event_cancelled",
			label: "Event Cancelled",
			icon: "x-circle",
			color_classes: "text-red-600",
			bg_color_classes: "bg-red-50",
			priority: "high" as const,
			enabled: true,
			description: "Notification when a calendar event is cancelled",
		},
		{
			type_key: "resource_booking_approved",
			label: "Resource Booking Approved",
			icon: "check-circle",
			color_classes: "text-green-600",
			bg_color_classes: "bg-green-50",
			priority: "low" as const,
			enabled: true,
			description: "Notification when a resource booking is approved",
		},
		{
			type_key: "resource_booking_rejected",
			label: "Resource Booking Rejected",
			icon: "x-circle",
			color_classes: "text-red-600",
			bg_color_classes: "bg-red-50",
			priority: "medium" as const,
			enabled: true,
			description: "Notification when a resource booking is rejected",
		},
		{
			type_key: "delegation_granted",
			label: "Calendar Delegation Granted",
			icon: "user-plus",
			color_classes: "text-blue-600",
			bg_color_classes: "bg-blue-50",
			priority: "low" as const,
			enabled: true,
			description: "Notification when calendar delegation is granted",
		},
		{
			type_key: "calendar_shared",
			label: "Calendar Shared",
			icon: "share-2",
			color_classes: "text-blue-600",
			bg_color_classes: "bg-blue-50",
			priority: "medium" as const,
			enabled: true,
			description: "Notification when a calendar is shared with you",
		},
	];

	for (const type of calendarNotificationTypes) {
		try {
			// Check if type already exists
			const existingType = await notificationService.getNotificationType(
				type.type_key,
			);
			if (!existingType) {
				await notificationService.createNotificationType(type);
			}
		} catch (error) {
			console.error(
				`[SERVER] initializeCalendarNotificationTypes] Error creating notification type ${type.type_key}:`,
				error,
			);
		}
	}
}
