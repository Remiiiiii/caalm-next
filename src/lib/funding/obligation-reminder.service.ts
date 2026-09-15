import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { daysUntil } from "./constants";
import { listObligationsWithDueDate } from "./obligation.repository";
import { isObligationOpen } from "./obligation-queue.service";
import {
	normalizeObligationDueDate,
	obligationReminderSentKey,
	parseObligationReminderMetadata,
} from "./obligation-reminder-notice";
import {
	ensureObligationReminderNotificationTypes,
	OBLIGATION_REMINDER_TYPE_KEY,
} from "./obligation-reminder-notification-types";
import type { ContractObligation } from "./types";

export type ObligationReminderStats = {
	scanned: number;
	eligible: number;
	sent: number;
	skipped: number;
};

export type ObligationReminderSendInput = {
	userId: string;
	obligationTitle: string;
	contractName: string;
	dueDate: string;
	daysUntilDue: number;
	contractId: string;
	obligationId: string;
	reminderDaysBefore: number;
};

export type ObligationReminderDeps = {
	ensureTypes: () => Promise<void>;
	listDueObligations: () => Promise<ContractObligation[]>;
	loadSentKeys: () => Promise<Set<string>>;
	sendReminder: (input: ObligationReminderSendInput) => Promise<void>;
};

function isValidReminderDaysBefore(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function shouldSendObligationReminderToday(
	obligation: Pick<
		ContractObligation,
		"status" | "dueDate" | "reminderDaysBefore"
	>,
): boolean {
	if (!isObligationOpen(obligation)) return false;
	if (!obligation.dueDate) return false;
	if (!isValidReminderDaysBefore(obligation.reminderDaysBefore)) return false;
	const days = daysUntil(obligation.dueDate);
	return days != null && days === obligation.reminderDaysBefore;
}

export function resolveObligationReminderRecipient(
	obligation: Pick<ContractObligation, "ownerUserId" | "createdByUserId">,
): string | null {
	const owner = obligation.ownerUserId?.trim();
	if (owner) return owner;
	const creator = obligation.createdByUserId?.trim();
	return creator || null;
}

export async function loadObligationReminderSentKeys(): Promise<Set<string>> {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.notificationsCollectionId || "notifications";
	const sent = new Set<string>();

	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries: [
			Query.equal("type", OBLIGATION_REMINDER_TYPE_KEY),
			Query.orderDesc("$createdAt"),
			Query.limit(500),
		],
	});

	for (const row of existing.rows) {
		const parsed = parseObligationReminderMetadata(
			(row as { metadata?: string }).metadata,
		);
		if (parsed) {
			sent.add(obligationReminderSentKey(parsed));
		}
	}

	return sent;
}

const defaultDeps: ObligationReminderDeps = {
	ensureTypes: ensureObligationReminderNotificationTypes,
	listDueObligations: () => listObligationsWithDueDate(1000),
	loadSentKeys: loadObligationReminderSentKeys,
	sendReminder: async (input) => {
		const { triggerObligationReminderNotification } = await import(
			"@/lib/utils/notificationTriggers"
		);
		await triggerObligationReminderNotification(input);
	},
};

export async function processObligationReminders(
	deps: Partial<ObligationReminderDeps> = {},
): Promise<ObligationReminderStats> {
	const resolved: ObligationReminderDeps = { ...defaultDeps, ...deps };
	await resolved.ensureTypes();

	const [obligations, sentKeys] = await Promise.all([
		resolved.listDueObligations(),
		resolved.loadSentKeys(),
	]);

	const stats: ObligationReminderStats = {
		scanned: obligations.length,
		eligible: 0,
		sent: 0,
		skipped: 0,
	};

	for (const obligation of obligations) {
		if (!shouldSendObligationReminderToday(obligation)) continue;
		stats.eligible += 1;

		const recipientId = resolveObligationReminderRecipient(obligation);
		const dueDate = obligation.dueDate;
		const reminderDaysBefore = obligation.reminderDaysBefore;
		if (!recipientId || !dueDate || reminderDaysBefore == null) {
			stats.skipped += 1;
			continue;
		}

		const daysUntilDue = daysUntil(dueDate);
		if (daysUntilDue == null) {
			stats.skipped += 1;
			continue;
		}

		const sentKey = obligationReminderSentKey({
			obligationId: obligation.$id,
			dueDate: normalizeObligationDueDate(dueDate),
			reminderDaysBefore,
		});
		if (sentKeys.has(sentKey)) {
			stats.skipped += 1;
			continue;
		}

		try {
			await resolved.sendReminder({
				userId: recipientId,
				obligationTitle: obligation.title,
				contractName: obligation.contractName || "Untitled contract",
				dueDate,
				daysUntilDue,
				contractId: obligation.contractId,
				obligationId: obligation.$id,
				reminderDaysBefore,
			});
			sentKeys.add(sentKey);
			stats.sent += 1;
		} catch (error) {
			console.error(
				`[obligation-reminders] failed to notify for ${obligation.$id}`,
				error,
			);
			stats.skipped += 1;
		}
	}

	return stats;
}
