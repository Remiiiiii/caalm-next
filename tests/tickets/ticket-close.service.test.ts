import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import type { Ticket } from "@/lib/tickets/ticket.types";

const getTicketById = vi.fn();
const updateTicket = vi.fn();
const getLatestRun = vi.fn();

vi.mock("@/lib/tickets/ticket.repository", () => ({
	getTicketById: (...args: unknown[]) => getTicketById(...args),
	updateTicket: (...args: unknown[]) => updateTicket(...args),
}));
vi.mock("@/lib/tickets/cursor-agent.service", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/tickets/cursor-agent.service")
	>("@/lib/tickets/cursor-agent.service");
	return {
		...actual,
		getLatestRun: (...args: unknown[]) => getLatestRun(...args),
	};
});
vi.mock("@/lib/tickets/ticket-events.repository", () => ({
	appendTicketEvent: vi.fn(),
}));
vi.mock("@/lib/tickets/ticket-notification.service", () => ({
	notifyTicketStaff: vi.fn(),
	notifyTicketSubmitter: vi.fn(),
}));

import { closeTicket } from "@/lib/tickets/ticket-close.service";

const ticket: Ticket = {
	$id: "t1",
	title: "Broken login",
	description: "SSO fails",
	lane: "engineering",
	submittedByUserId: "user_submitter",
	submittedByName: "Ada",
	department: "Legal",
	submittedAt: "2026-08-12T00:00:00.000Z",
	severity: "high",
	status: "IN_PROGRESS",
	orgId: "org_1",
	assigneeCaalmUserId: "staff",
	githubIssueNumber: 42,
	cursorAgentRunId: "bc-agent",
};

const input = {
	ticketId: "t1",
	actorId: "staff",
	permissions: [PERMISSIONS.TICKETS.RESOLVE],
};

describe("closeTicket with a fix agent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getTicketById.mockResolvedValue(ticket);
		updateTicket.mockResolvedValue({ ...ticket, status: "RESOLVED" });
	});

	it("blocks while the agent run is still working", async () => {
		getLatestRun.mockResolvedValue({ id: "r1", status: "RUNNING" });
		await expect(closeTicket(input)).rejects.toThrow(/still working/);
		expect(updateTicket).not.toHaveBeenCalled();
	});

	it("allows closing once the run has finished", async () => {
		getLatestRun.mockResolvedValue({ id: "r1", status: "FINISHED" });
		const result = await closeTicket(input);
		expect(result.status).toBe("RESOLVED");
	});

	it("falls back to the ticket status when Cursor can't be reached", async () => {
		getLatestRun.mockRejectedValue(new Error("down"));
		await expect(closeTicket(input)).rejects.toThrow(/still working/);

		getTicketById.mockResolvedValue({ ...ticket, status: "PR_OPEN" });
		await expect(closeTicket(input)).resolves.toBeDefined();
	});
});
