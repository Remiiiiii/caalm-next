import { NotificationService } from "@/lib/services/notificationService";

export const OBLIGATION_REMINDER_TYPE_KEY = "obligation-reminder";

const OBLIGATION_REMINDER_NOTIFICATION_TYPES = [
	{
		type_key: OBLIGATION_REMINDER_TYPE_KEY,
		label: "Obligation reminder",
		icon: "clock",
		color_classes: "text-blue-600",
		bg_color_classes: "bg-blue-50",
		priority: "high" as const,
		enabled: true,
		description: "Alert when a contract obligation is due soon",
	},
] as const;

let reminderTypesEnsured: Promise<void> | null = null;

/** Create the obligation-reminder type row once if it is missing from Appwrite. */
export async function ensureObligationReminderNotificationTypes(): Promise<void> {
	if (!reminderTypesEnsured) {
		reminderTypesEnsured = (async () => {
			const service = new NotificationService();
			for (const type of OBLIGATION_REMINDER_NOTIFICATION_TYPES) {
				try {
					const existing = await service.getNotificationType(type.type_key);
					if (!existing) {
						await service.createNotificationType({ ...type });
					}
				} catch (error) {
					console.warn(
						`[obligation-reminders] failed to ensure type ${type.type_key}`,
						error,
					);
				}
			}
		})();
	}
	await reminderTypesEnsured;
}
