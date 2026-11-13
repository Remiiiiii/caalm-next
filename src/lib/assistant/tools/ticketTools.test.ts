import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getTicketById = vi.fn();
const getTicketByNumber = vi.fn();
const listTickets = vi.fn();
const assignTicket = vi.fn();
const intakeTicket = vi.fn();
const listItStaff = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/tickets/ticket.repository", () => ({
	getTicketById: (...args: unknown[]) => getTicketById(...args),
	getTicketByNumber: (...args: unknown[]) => getTicketByNumber(...args),
	listTickets: (...args: unknown[]) => listTickets(...args),
}));
vi.mock("@/lib/tickets/ticket-assign.service", () => ({
	assignTicket: (...args: unknown[]) => assignTicket(...args),
}));
vi.mock("@/lib/tickets/ticket-intake.service", () => ({
	intakeTicket: (...args: unknown[]) => intakeTicket(...args),
}));
vi.mock("@/lib/tickets/ticket-staff", () => ({
	listItStaff: (...args: unknown[]) => listItStaff(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { TICKET_TOOLS } = await import("./ticketTools");

function tool(name: string) {
	const found = TICKET_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		pathname: "/dashboard/it",
		user: { $id: "user-1", email: "user@org.test", name: "Jamie" },
	} as unknown as Parameters<(typeof TICKET_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const ticketRow = {
	$id: "t-1",
	orgId: "org-1",
	ticketNumber: "TKT-2026-0001",
	title: "Can't log in",
	status: "OPEN",
	severity: "medium",
	submittedByName: "Jamie",
	submittedAt: "2026-01-01T00:00:00.000Z",
	assigneeCaalmUserId: null,
};

describe("TICKET_TOOLS (11.1-11.2)", () => {
	beforeEach(() => {
		getTicketById.mockReset();
		getTicketByNumber.mockReset();
		listTickets.mockReset();
		assignTicket.mockReset();
		intakeTicket.mockReset();
		listItStaff.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("create_ticket", () => {
		it("blocks create without tickets.create", async () => {
			const res = await tool("create_ticket").handler(ctx([]), {
				title: "Broken thing",
				description: "It is broken",
				category: "Hardware",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(intakeTicket).not.toHaveBeenCalled();
		});

		it("rejects an invalid category", async () => {
			const res = await tool("create_ticket").handler(
				ctx([PERMISSIONS.TICKETS.CREATE]),
				{
					title: "Broken thing",
					description: "It is broken",
					category: "Nope",
				},
			);
			expect(errorOf(res)).toMatch(/category must be one of/i);
			expect(intakeTicket).not.toHaveBeenCalled();
		});

		it("creates a help-lane ticket and audits", async () => {
			intakeTicket.mockResolvedValueOnce(ticketRow);
			const res = await tool("create_ticket").handler(
				ctx([PERMISSIONS.TICKETS.CREATE]),
				{
					title: "Can't log in",
					description: "Getting an error on sign-in",
					category: "Access & Permissions",
				},
			);
			expect(intakeTicket).toHaveBeenCalledWith(
				expect.objectContaining({
					payload: expect.objectContaining({ lane: "help" }),
					orgId: "org-1",
				}),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { ticketId: string }).ticketId).toBe("t-1");
		});

		it("blocks list without tickets.view", async () => {
			const res = await tool("create_ticket").handler(ctx([]), {
				action: "list",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(listTickets).not.toHaveBeenCalled();
		});

		it("lists org-scoped tickets", async () => {
			listTickets.mockResolvedValueOnce({ items: [ticketRow], total: 1 });
			const res = await tool("create_ticket").handler(
				ctx([PERMISSIONS.TICKETS.VIEW]),
				{ action: "list" },
			);
			expect(listTickets).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1" }),
			);
			expect((res.result as { total: number }).total).toBe(1);
		});

		it("get rejects a ticket from another org", async () => {
			getTicketById.mockResolvedValueOnce({ ...ticketRow, orgId: "org-2" });
			const res = await tool("create_ticket").handler(
				ctx([PERMISSIONS.TICKETS.VIEW]),
				{ action: "get", ticketId: "t-1" },
			);
			expect(errorOf(res)).toMatch(/couldn't find/i);
		});
	});

	describe("assign_ticket", () => {
		it("blocks without tickets.assign", async () => {
			const res = await tool("assign_ticket").handler(ctx([]), {
				ticketId: "t-1",
				assigneeId: "staff-1",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(assignTicket).not.toHaveBeenCalled();
		});

		it("resolves the assignee by name when multiple staff match", async () => {
			getTicketById.mockResolvedValueOnce(ticketRow);
			listItStaff.mockResolvedValueOnce([
				{ $id: "s-1", fullName: "Jamie Smith" },
				{ $id: "s-2", fullName: "Jamie Lee" },
			]);
			const res = await tool("assign_ticket").handler(
				ctx([PERMISSIONS.TICKETS.ASSIGN]),
				{ ticketId: "t-1", assigneeName: "Jamie" },
			);
			expect(errorOf(res)).toMatch(/found 2 staff/i);
			expect(assignTicket).not.toHaveBeenCalled();
		});

		it("assigns the ticket and audits", async () => {
			getTicketById.mockResolvedValueOnce(ticketRow);
			assignTicket.mockResolvedValueOnce({
				...ticketRow,
				status: "ASSIGNED",
				assigneeCaalmUserId: "staff-1",
			});
			const res = await tool("assign_ticket").handler(
				ctx([PERMISSIONS.TICKETS.ASSIGN]),
				{ ticketId: "t-1", assigneeId: "staff-1" },
			);
			expect(assignTicket).toHaveBeenCalledWith(
				expect.objectContaining({ ticketId: "t-1", assigneeId: "staff-1" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { status: string }).status).toBe("ASSIGNED");
		});

		it("surfaces a policy error from assignTicket", async () => {
			getTicketById.mockResolvedValueOnce(ticketRow);
			assignTicket.mockRejectedValueOnce(
				new Error("Not allowed to assign this ticket"),
			);
			const res = await tool("assign_ticket").handler(
				ctx([PERMISSIONS.TICKETS.ASSIGN]),
				{ ticketId: "t-1", assigneeId: "staff-1" },
			);
			expect(errorOf(res)).toMatch(/not allowed to assign/i);
		});
	});
});
