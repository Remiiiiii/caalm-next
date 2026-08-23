import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/timezone/org", () => ({
	getOrganizationTimezone: vi.fn(async () => "UTC"),
}));

vi.mock("@/lib/appwrite", () => ({
	createAdminClient: vi.fn(),
}));

vi.mock("@/lib/actions/calendar.actions", () => ({
	getCalendarEventById: vi.fn(),
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getUserById: vi.fn(),
	getUserByAccountId: vi.fn(),
}));

vi.mock("@/lib/rbac/permissions", () => ({
	getUserDefaultOrganization: vi.fn(),
}));

vi.mock("./notificationService", () => ({
	notificationService: {
		createNotification: vi.fn(),
		sendSMSNotification: vi.fn(),
	},
}));

import { computeReminderDueAt } from "./calendar-notifications.service";

describe("computeReminderDueAt", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("subtracts minutes from event start", async () => {
		const due = await computeReminderDueAt(
			{ reminderType: "before_start", reminderMinutes: 15 },
			{
				startDate: "2026-08-23T00:00:00.000Z",
				startTime: "15:00",
			},
		);

		expect(due.toISOString()).toBe("2026-08-23T14:45:00.000Z");
	});

	it("uses end time for before_end reminders", async () => {
		const due = await computeReminderDueAt(
			{ reminderType: "before_end", reminderMinutes: 30 },
			{
				startDate: "2026-08-23T00:00:00.000Z",
				endDate: "2026-08-23T00:00:00.000Z",
				startTime: "15:00",
				endTime: "16:00",
			},
		);

		expect(due.toISOString()).toBe("2026-08-23T15:30:00.000Z");
	});
});
