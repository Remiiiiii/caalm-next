import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getCalendarEventsByMonth = vi.fn();
const createCalendarEvent = vi.fn();
const updateCalendarEvent = vi.fn();
const createCalendarApprovalRequest = vi.fn();
const decideCalendarApprovalRequest = vi.fn();
const getCalendarApprovalById = vi.fn();
const listCalendarApprovalRequests = vi.fn();
const getOrCreatePrimaryCalendar = vi.fn();
const sharePrimaryCalendarWithUser = vi.fn();
const getCalendarsSharedWithUser = vi.fn();
const getUserByEmail = vi.fn();
const evaluateCalendarPermission = vi.fn();
const getCalendarEventInOrg = vi.fn();
const listRegistrationsForEvent = vi.fn();
const createTicketType = vi.fn();
const getCurrentUserId = vi.fn();
const getUserDefaultOrganization = vi.fn();
const notifyMeetingInvitees = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/actions/calendar.actions", () => ({
	getCalendarEventsByMonth: (...args: unknown[]) =>
		getCalendarEventsByMonth(...args),
	createCalendarEvent: (...args: unknown[]) => createCalendarEvent(...args),
	updateCalendarEvent: (...args: unknown[]) => updateCalendarEvent(...args),
}));
vi.mock("@/lib/actions/calendar-approval.actions", () => ({
	createCalendarApprovalRequest: (...args: unknown[]) =>
		createCalendarApprovalRequest(...args),
	decideCalendarApprovalRequest: (...args: unknown[]) =>
		decideCalendarApprovalRequest(...args),
	getCalendarApprovalById: (...args: unknown[]) =>
		getCalendarApprovalById(...args),
	listCalendarApprovalRequests: (...args: unknown[]) =>
		listCalendarApprovalRequests(...args),
}));
vi.mock("@/lib/actions/shared-calendar.actions", () => ({
	getOrCreatePrimaryCalendar: (...args: unknown[]) =>
		getOrCreatePrimaryCalendar(...args),
	sharePrimaryCalendarWithUser: (...args: unknown[]) =>
		sharePrimaryCalendarWithUser(...args),
	getCalendarsSharedWithUser: (...args: unknown[]) =>
		getCalendarsSharedWithUser(...args),
}));
vi.mock("@/lib/actions/user.actions", () => ({
	getUserByEmail: (...args: unknown[]) => getUserByEmail(...args),
}));
vi.mock("@/lib/auth/guards", () => ({
	evaluateCalendarPermission: (...args: unknown[]) =>
		evaluateCalendarPermission(...args),
}));
vi.mock("@/lib/events/calendar-event-access", () => ({
	getCalendarEventInOrg: (...args: unknown[]) => getCalendarEventInOrg(...args),
}));
vi.mock("@/lib/events/event-registrations.repository", () => ({
	listRegistrationsForEvent: (...args: unknown[]) =>
		listRegistrationsForEvent(...args),
}));
vi.mock("@/lib/events/ticket-types.repository", () => ({
	createTicketType: (...args: unknown[]) => createTicketType(...args),
}));
vi.mock("@/lib/microsoft/auth-utils", () => ({
	getCurrentUserId: (...args: unknown[]) => getCurrentUserId(...args),
}));
vi.mock("@/lib/rbac/permissions", () => ({
	getUserDefaultOrganization: (...args: unknown[]) =>
		getUserDefaultOrganization(...args),
}));
vi.mock("@/lib/services/calendar-notifications.service", () => ({
	notifyMeetingInvitees: (...args: unknown[]) => notifyMeetingInvitees(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));
vi.mock("@/lib/utils/conflict-detection", () => ({
	detectParticipantConflicts: vi.fn(),
}));

const { CALENDAR_TOOLS } = await import("./calendarTools");

function tool(name: string) {
	const found = CALENDAR_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "admin-1", email: "admin@org.test", name: "Admin" },
	} as unknown as Parameters<(typeof CALENDAR_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const eventRow = {
	$id: "e-1",
	title: "Board sync",
	startDate: "2099-01-05",
	startTime: "10:00",
	endTime: "10:30",
	participants: "Alice <alice@test.com>",
};

describe("CALENDAR_TOOLS (9.1-9.4)", () => {
	beforeEach(() => {
		getCalendarEventsByMonth.mockReset().mockResolvedValue([eventRow]);
		createCalendarEvent.mockReset();
		updateCalendarEvent.mockReset();
		createCalendarApprovalRequest.mockReset();
		decideCalendarApprovalRequest.mockReset();
		getCalendarApprovalById.mockReset();
		listCalendarApprovalRequests.mockReset();
		getOrCreatePrimaryCalendar.mockReset();
		sharePrimaryCalendarWithUser.mockReset();
		getCalendarsSharedWithUser.mockReset();
		getUserByEmail.mockReset();
		evaluateCalendarPermission.mockReset().mockResolvedValue({
			allowed: true,
			userId: "admin-1",
		});
		getCalendarEventInOrg.mockReset();
		listRegistrationsForEvent.mockReset();
		createTicketType.mockReset();
		getCurrentUserId.mockReset().mockResolvedValue("account-1");
		getUserDefaultOrganization.mockReset();
		notifyMeetingInvitees.mockReset().mockResolvedValue(1);
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("invite_event_attendees", () => {
		it("blocks without events.invite", async () => {
			const res = await tool("invite_event_attendees").handler(ctx([]), {
				eventTitle: "Board sync",
				participants: "Bob <bob@test.com>",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(updateCalendarEvent).not.toHaveBeenCalled();
		});

		it("errors when no upcoming meeting matches", async () => {
			getCalendarEventsByMonth.mockResolvedValueOnce([]);
			const res = await tool("invite_event_attendees").handler(
				ctx([PERMISSIONS.EVENTS.INVITE]),
				{ eventTitle: "Nonexistent", participants: "Bob <bob@test.com>" },
			);
			expect(errorOf(res)).toMatch(/couldn't find/i);
		});

		it("appends new participants, notifies only them, and audits", async () => {
			updateCalendarEvent.mockResolvedValueOnce({
				...eventRow,
				participants: "Alice <alice@test.com>, Bob <bob@test.com>",
			});
			const res = await tool("invite_event_attendees").handler(
				ctx([PERMISSIONS.EVENTS.INVITE]),
				{ eventTitle: "Board", participants: "Bob <bob@test.com>" },
			);
			expect(updateCalendarEvent).toHaveBeenCalledWith(
				"e-1",
				expect.objectContaining({
					participants: "Alice <alice@test.com>, Bob <bob@test.com>",
				}),
			);
			expect(notifyMeetingInvitees).toHaveBeenCalledWith(
				"Bob <bob@test.com>",
				expect.any(Object),
				"admin-1",
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { invitedCount: number }).invitedCount).toBe(1);
		});
	});

	describe("approve_calendar_request", () => {
		it("blocks without events.approve", async () => {
			const res = await tool("approve_calendar_request").handler(ctx([]), {
				approvalId: "a-1",
				decision: "approved",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(decideCalendarApprovalRequest).not.toHaveBeenCalled();
		});

		it("rejects an invalid decision", async () => {
			const res = await tool("approve_calendar_request").handler(
				ctx([PERMISSIONS.EVENTS.APPROVE]),
				{ approvalId: "a-1", decision: "maybe" },
			);
			expect(errorOf(res)).toMatch(/decision must be/i);
		});

		it("denies a request whose event is in another org", async () => {
			getCalendarApprovalById.mockResolvedValueOnce({
				$id: "a-1",
				eventId: "e-1",
			});
			getCalendarEventInOrg.mockResolvedValueOnce(null);
			const res = await tool("approve_calendar_request").handler(
				ctx([PERMISSIONS.EVENTS.APPROVE]),
				{ approvalId: "a-1", decision: "approved" },
			);
			expect(errorOf(res)).toMatch(/doesn't belong to this organization/i);
			expect(decideCalendarApprovalRequest).not.toHaveBeenCalled();
		});

		it("decides the request and audits", async () => {
			getCalendarApprovalById.mockResolvedValueOnce({
				$id: "a-1",
				eventId: "e-1",
			});
			getCalendarEventInOrg.mockResolvedValueOnce({
				$id: "e-1",
				orgId: "org-1",
				title: "Board sync",
			});
			decideCalendarApprovalRequest.mockResolvedValueOnce({
				$id: "a-1",
				status: "approved",
			});
			const res = await tool("approve_calendar_request").handler(
				ctx([PERMISSIONS.EVENTS.APPROVE]),
				{ approvalId: "a-1", decision: "approved" },
			);
			expect(decideCalendarApprovalRequest).toHaveBeenCalledWith(
				expect.objectContaining({ approvalId: "a-1", decision: "approved" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { status: string }).status).toBe("approved");
		});
	});

	describe("share_calendar", () => {
		it("blocks without calendar.create", async () => {
			const res = await tool("share_calendar").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
		});

		it("lists calendars shared with the user", async () => {
			getCalendarsSharedWithUser.mockResolvedValueOnce([{ $id: "cal-1" }]);
			const res = await tool("share_calendar").handler(
				ctx([PERMISSIONS.CALENDAR.CREATE]),
				{},
			);
			expect(getCalendarsSharedWithUser).toHaveBeenCalledWith(
				"admin-1",
				"org-1",
			);
			expect((res.result as { count: number }).count).toBe(1);
		});

		it("refuses to share with a user outside the org", async () => {
			getUserDefaultOrganization.mockResolvedValueOnce({ orgId: "org-2" });
			const res = await tool("share_calendar").handler(
				ctx([PERMISSIONS.CALENDAR.CREATE]),
				{
					action: "share",
					sharedWithUserId: "u-2",
					permissionLevel: "view_titles",
				},
			);
			expect(errorOf(res)).toMatch(/not in this organization/i);
			expect(sharePrimaryCalendarWithUser).not.toHaveBeenCalled();
		});

		it("shares the calendar and audits", async () => {
			getUserDefaultOrganization.mockResolvedValueOnce({ orgId: "org-1" });
			sharePrimaryCalendarWithUser.mockResolvedValueOnce({ $id: "cal-1" });
			const res = await tool("share_calendar").handler(
				ctx([PERMISSIONS.CALENDAR.CREATE]),
				{
					action: "share",
					sharedWithUserId: "u-2",
					permissionLevel: "view_titles",
				},
			);
			expect(sharePrimaryCalendarWithUser).toHaveBeenCalledWith(
				"admin-1",
				"u-2",
				"view_titles",
				"admin-1",
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { shared: boolean }).shared).toBe(true);
		});
	});

	describe("create_public_event", () => {
		it("blocks without events.create", async () => {
			const res = await tool("create_public_event").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
		});

		it("requires a positive capacity", async () => {
			const res = await tool("create_public_event").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{
					title: "Gala",
					date: "2099-01-05",
					startTime: "10:00",
					capacity: 0,
				},
			);
			expect(errorOf(res)).toMatch(/positive ticket capacity/i);
			expect(createCalendarEvent).not.toHaveBeenCalled();
		});

		it("creates the event with a ticket type and audits", async () => {
			createCalendarEvent.mockResolvedValueOnce({ $id: "e-2" });
			createTicketType.mockResolvedValueOnce({ $id: "tt-1" });
			const res = await tool("create_public_event").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{
					title: "Gala",
					date: "2099-01-05",
					startTime: "10:00",
					capacity: 100,
				},
			);
			expect(createCalendarEvent).toHaveBeenCalled();
			expect(createTicketType).toHaveBeenCalledWith(
				expect.objectContaining({
					orgId: "org-1",
					eventId: "e-2",
					capacity: 100,
				}),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { ticketTypeId: string }).ticketTypeId).toBe(
				"tt-1",
			);
		});

		it("lists registrations for an org-scoped event", async () => {
			getCalendarEventInOrg.mockResolvedValueOnce({
				$id: "e-2",
				orgId: "org-1",
			});
			listRegistrationsForEvent.mockResolvedValueOnce([{ $id: "r-1" }]);
			const res = await tool("create_public_event").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ action: "list_registrations", eventId: "e-2" },
			);
			expect(listRegistrationsForEvent).toHaveBeenCalledWith("org-1", "e-2");
			expect((res.result as { count: number }).count).toBe(1);
		});

		it("denies listing registrations for an event outside the org", async () => {
			getCalendarEventInOrg.mockResolvedValueOnce(null);
			const res = await tool("create_public_event").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ action: "list_registrations", eventId: "e-2" },
			);
			expect(errorOf(res)).toMatch(/no event found/i);
		});
	});
});
