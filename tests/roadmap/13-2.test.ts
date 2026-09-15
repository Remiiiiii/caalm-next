import { describe, expect, it } from "vitest";
import {
	buildDeletionCancelSettings,
	buildDeletionRequestSettings,
	computeDeletionScheduledAt,
	isDeletionGraceElapsed,
	TENANT_DELETION_GRACE_DAYS,
} from "@/lib/portability/tenant-deletion-notice";

describe("13.2 tenant deletion workflow", () => {
	it("schedules deletion after the grace period", () => {
		const requestedAt = new Date("2026-09-14T12:00:00.000Z");
		const scheduled = computeDeletionScheduledAt(requestedAt, 14);
		expect(scheduled.toISOString()).toBe("2026-09-28T12:00:00.000Z");
		expect(TENANT_DELETION_GRACE_DAYS).toBe(14);
	});

	it("treats grace as elapsed on or after the scheduled time", () => {
		expect(
			isDeletionGraceElapsed(
				"2026-09-28T12:00:00.000Z",
				new Date("2026-09-28T12:00:00.000Z"),
			),
		).toBe(true);
		expect(
			isDeletionGraceElapsed(
				"2026-09-28T12:00:00.000Z",
				new Date("2026-09-27T12:00:00.000Z"),
			),
		).toBe(false);
	});

	it("writes request metadata and clears it on cancel", () => {
		const requestedAt = new Date("2026-09-14T12:00:00.000Z");
		const requested = buildDeletionRequestSettings({
			existingSettings: {
				maxUsers: 10,
				maxDepartments: 3,
				features: [],
				timezone: "America/New_York",
			},
			requestedAt,
			userId: "user-1",
			userEmail: "admin@example.com",
		});
		expect(requested.deletionRequestedAt).toBe(requestedAt.toISOString());
		expect(requested.deletionScheduledAt).toBe("2026-09-28T12:00:00.000Z");
		expect(requested.deletionRequestedByUserId).toBe("user-1");

		const cancelled = buildDeletionCancelSettings(
			requested,
			new Date("2026-09-15T12:00:00.000Z"),
		);
		expect(cancelled.deletionRequestedAt).toBeUndefined();
		expect(cancelled.deletionScheduledAt).toBeUndefined();
		expect(cancelled.deletionCancelledAt).toBe("2026-09-15T12:00:00.000Z");
		expect(cancelled.timezone).toBe("America/New_York");
	});
});
