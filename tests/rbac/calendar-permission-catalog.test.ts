/**
 * Calendar authz: org permission catalog → CalendarPermissionMap.
 * Covers GitHub issue #38 (no role-name bridges for calendar gates).
 */

import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import {
	buildCalendarPermissionMapFromCatalog,
	isCalendarEventOwner,
	resolveCalendarPermissions,
} from "@/lib/auth/permissions";

describe("buildCalendarPermissionMapFromCatalog", () => {
	it("Viewer pack: view only, no create/edit/cancel", () => {
		const map = buildCalendarPermissionMapFromCatalog({
			held: [PERMISSIONS.CALENDAR.VIEW_OWN],
			isEventOwner: true,
		});
		expect(map.createEvent).toBe(false);
		expect(map.updateEvent).toBe(false);
		expect(map.cancelEvent).toBe(false);
		expect(map.manageParticipants).toBe(false);
		expect(map.viewSensitiveDetails).toBe(false);
	});

	it("Dept Manager pack: edit_all + reschedule, no create from pack alone", () => {
		const map = buildCalendarPermissionMapFromCatalog({
			held: [
				PERMISSIONS.CALENDAR.VIEW_TEAM,
				PERMISSIONS.CALENDAR.EDIT_ALL,
				PERMISSIONS.EVENTS.APPROVE,
				PERMISSIONS.EVENTS.RESCHEDULE,
			],
			isEventOwner: false,
		});
		expect(map.createEvent).toBe(false);
		expect(map.updateEvent).toBe(true);
		expect(map.viewSensitiveDetails).toBe(true);
		expect(map.cancelEvent).toBe(false);
	});

	it("EDIT_OWN only updates when owner", () => {
		const asOwner = buildCalendarPermissionMapFromCatalog({
			held: [PERMISSIONS.CALENDAR.EDIT_OWN],
			isEventOwner: true,
		});
		const asOther = buildCalendarPermissionMapFromCatalog({
			held: [PERMISSIONS.CALENDAR.EDIT_OWN],
			isEventOwner: false,
		});
		expect(asOwner.updateEvent).toBe(true);
		expect(asOther.updateEvent).toBe(false);
	});

	it("Org Admin style: CREATE + EDIT_ALL + DELETE_ALL", () => {
		const map = buildCalendarPermissionMapFromCatalog({
			held: [
				PERMISSIONS.CALENDAR.VIEW_ALL,
				PERMISSIONS.CALENDAR.CREATE,
				PERMISSIONS.CALENDAR.EDIT_ALL,
				PERMISSIONS.CALENDAR.DELETE_ALL,
				PERMISSIONS.EVENTS.CREATE,
				PERMISSIONS.EVENTS.INVITE,
				PERMISSIONS.EVENTS.CANCEL,
			],
			isEventOwner: false,
		});
		expect(map.createEvent).toBe(true);
		expect(map.updateEvent).toBe(true);
		expect(map.cancelEvent).toBe(true);
		expect(map.manageParticipants).toBe(true);
		expect(map.viewSensitiveDetails).toBe(true);
	});

	it("IT pack VIEW_OWN alone does not grant admin calendar powers", () => {
		const map = buildCalendarPermissionMapFromCatalog({
			held: [PERMISSIONS.CALENDAR.VIEW_OWN],
			isEventOwner: false,
		});
		expect(map.createEvent).toBe(false);
		expect(map.updateEvent).toBe(false);
		expect(map.cancelEvent).toBe(false);
		expect(map.viewSensitiveDetails).toBe(false);
	});

	it("EDIT_ALL implies EDIT_OWN via permissionSatisfied", () => {
		const map = buildCalendarPermissionMapFromCatalog({
			held: [PERMISSIONS.CALENDAR.EDIT_ALL],
			isEventOwner: true,
		});
		expect(map.updateEvent).toBe(true);
	});
});

describe("resolveCalendarPermissions with heldPermissions", () => {
	it("ignores legacy role when heldPermissions is provided", () => {
		const map = resolveCalendarPermissions({
			role: "admin",
			heldPermissions: [PERMISSIONS.CALENDAR.VIEW_OWN],
			isEventOwner: false,
			context: { userId: "u1" },
		});
		expect(map.createEvent).toBe(false);
		expect(map.updateEvent).toBe(false);
	});
});

describe("isCalendarEventOwner", () => {
	it("matches createdByUserId and account ids", () => {
		expect(
			isCalendarEventOwner({
				userId: "doc1",
				userAccountId: "acc1",
				event: { createdByUserId: "doc1" },
			}),
		).toBe(true);
		expect(
			isCalendarEventOwner({
				userId: "doc1",
				userAccountId: "acc1",
				event: { createdByAccountId: "acc1" },
			}),
		).toBe(true);
		expect(
			isCalendarEventOwner({
				userId: "doc1",
				userAccountId: "acc1",
				event: { createdBy: "other" },
			}),
		).toBe(false);
	});
});
