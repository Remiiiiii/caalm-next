import { describe, expect, it, vi } from "vitest";
import {
	buildObligationReminderMetadata,
	obligationReminderSentKey,
	parseObligationReminderMetadata,
} from "@/lib/funding/obligation-reminder-notice";
import {
	processObligationReminders,
	resolveObligationReminderRecipient,
	shouldSendObligationReminderToday,
	type ObligationReminderSendInput,
} from "@/lib/funding/obligation-reminder.service";
import type { ContractObligation } from "@/lib/funding/types";

function isoOffset(days: number): string {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + days);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function makeObligation(
	overrides: Partial<ContractObligation> & { $id: string; title: string },
): ContractObligation {
	return {
		$createdAt: "",
		$updatedAt: "",
		orgId: "org-1",
		contractId: "ctr-1",
		contractName: "Grant 2026",
		kind: "reporting",
		status: "open",
		renewalLinked: false,
		createdByUserId: "creator-1",
		...overrides,
	};
}

describe("shouldSendObligationReminderToday", () => {
	it("sends when open and days until due equals reminderDaysBefore", () => {
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-1",
					title: "Quarterly report",
					dueDate: isoOffset(7),
					reminderDaysBefore: 7,
				}),
			),
		).toBe(true);
	});

	it("sends on the due day when reminderDaysBefore is 0", () => {
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-due",
					title: "Due today",
					dueDate: isoOffset(0),
					reminderDaysBefore: 0,
				}),
			),
		).toBe(true);
	});

	it("skips closed obligations", () => {
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-done",
					title: "Done",
					status: "done",
					dueDate: isoOffset(7),
					reminderDaysBefore: 7,
				}),
			),
		).toBe(false);
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-waived",
					title: "Waived",
					status: "waived",
					dueDate: isoOffset(7),
					reminderDaysBefore: 7,
				}),
			),
		).toBe(false);
	});

	it("skips when the offset does not match today", () => {
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-early",
					title: "Too early",
					dueDate: isoOffset(14),
					reminderDaysBefore: 7,
				}),
			),
		).toBe(false);
	});

	it("skips missing due date or reminder offset", () => {
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-no-due",
					title: "No due",
					reminderDaysBefore: 7,
				}),
			),
		).toBe(false);
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-no-offset",
					title: "No offset",
					dueDate: isoOffset(7),
				}),
			),
		).toBe(false);
	});

	it("skips a negative reminder offset", () => {
		expect(
			shouldSendObligationReminderToday(
				makeObligation({
					$id: "ob-neg",
					title: "Negative",
					dueDate: isoOffset(-3),
					reminderDaysBefore: -3,
				}),
			),
		).toBe(false);
	});
});

describe("obligation reminder metadata", () => {
	it("builds and parses a stable sent key", () => {
		const meta = {
			obligationId: "ob-42",
			dueDate: "2026-05-20T15:00:00.000Z",
			reminderDaysBefore: 7,
		};
		const encoded = buildObligationReminderMetadata(meta);
		const parsed = parseObligationReminderMetadata(encoded);
		expect(parsed).toEqual({
			obligationId: "ob-42",
			dueDate: "2026-05-20",
			reminderDaysBefore: 7,
		});
		expect(obligationReminderSentKey(parsed!)).toBe("ob-42:2026-05-20:7");
	});

	it("reads extra fields from triggerNotification metadata", () => {
		const parsed = parseObligationReminderMetadata(
			JSON.stringify({
				obligationId: "ob-9",
				dueDate: "2026-01-02",
				reminderDaysBefore: 0,
				actionUrl: "/contracts/funding-retention",
				priority: "high",
			}),
		);
		expect(obligationReminderSentKey(parsed!)).toBe("ob-9:2026-01-02:0");
	});
});

describe("resolveObligationReminderRecipient", () => {
	it("prefers ownerUserId then createdByUserId", () => {
		expect(
			resolveObligationReminderRecipient({
				ownerUserId: "owner-1",
				createdByUserId: "creator-1",
			}),
		).toBe("owner-1");
		expect(
			resolveObligationReminderRecipient({
				createdByUserId: "creator-1",
			}),
		).toBe("creator-1");
		expect(
			resolveObligationReminderRecipient({
				ownerUserId: "  ",
				createdByUserId: "",
			}),
		).toBeNull();
	});
});

describe("processObligationReminders", () => {
	it("sends once and skips the same obligation on a second pass", async () => {
		const due = isoOffset(3);
		const obligation = makeObligation({
			$id: "ob-dedup",
			title: "Site visit",
			ownerUserId: "owner-9",
			dueDate: due,
			reminderDaysBefore: 3,
		});
		const sent: ObligationReminderSendInput[] = [];
		const sentKeys = new Set<string>();

		const deps = {
			ensureTypes: async () => undefined,
			listDueObligations: async () => [obligation],
			loadSentKeys: async () => new Set(sentKeys),
			sendReminder: async (input: ObligationReminderSendInput) => {
				sent.push(input);
			},
		};

		const first = await processObligationReminders(deps);
		expect(first).toEqual({
			scanned: 1,
			eligible: 1,
			sent: 1,
			skipped: 0,
		});
		expect(sent).toHaveLength(1);
		expect(sent[0].userId).toBe("owner-9");
		expect(sent[0].obligationId).toBe("ob-dedup");

		sentKeys.add(
			obligationReminderSentKey({
				obligationId: obligation.$id,
				dueDate: due,
				reminderDaysBefore: 3,
			}),
		);

		const second = await processObligationReminders(deps);
		expect(second.sent).toBe(0);
		expect(second.skipped).toBe(1);
		expect(sent).toHaveLength(1);
	});

	it("skips eligible rows with no recipient", async () => {
		const sendReminder = vi.fn();
		const result = await processObligationReminders({
			ensureTypes: async () => undefined,
			listDueObligations: async () => [
				makeObligation({
					$id: "ob-orphan",
					title: "No owner",
					createdByUserId: "",
					dueDate: isoOffset(1),
					reminderDaysBefore: 1,
				}),
			],
			loadSentKeys: async () => new Set(),
			sendReminder,
		});
		expect(result.eligible).toBe(1);
		expect(result.sent).toBe(0);
		expect(result.skipped).toBe(1);
		expect(sendReminder).not.toHaveBeenCalled();
	});
});
