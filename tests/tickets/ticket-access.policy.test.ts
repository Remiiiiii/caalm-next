import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import type { Ticket } from "@/lib/tickets/ticket.types";
import {
	canClaimTicket,
	canCloseTicket,
	canEscalateTicket,
	canResolveTicket,
	canStartFixAgent,
	canViewTicket,
	filterVisibleTickets,
} from "@/lib/tickets/ticket-access.policy";

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
	status: "ASSIGNED",
	orgId: "org_1",
	assigneeCaalmUserId: "user_assignee",
	githubIssueNumber: 42,
};

const helpTicket: Ticket = {
	...ticket,
	$id: "t-help",
	lane: "help",
	githubIssueNumber: null,
	assigneeCaalmUserId: null,
	status: "OPEN",
};

describe("ticket-access.policy", () => {
	it("lets a submitter view their own ticket", () => {
		expect(
			canViewTicket(ticket, {
				userId: "user_submitter",
				permissions: [PERMISSIONS.TICKETS.VIEW],
			}),
		).toBe(true);
	});

	it("hides other people's tickets from viewers", () => {
		expect(
			canViewTicket(ticket, {
				userId: "user_other",
				permissions: [PERMISSIONS.TICKETS.VIEW],
			}),
		).toBe(false);
	});

	it("lets IT assign holders view all tickets", () => {
		expect(
			canViewTicket(ticket, {
				userId: "user_it",
				permissions: [PERMISSIONS.TICKETS.VIEW, PERMISSIONS.TICKETS.ASSIGN],
			}),
		).toBe(true);
	});

	it("lets staff with resolve claim an unclaimed ticket", () => {
		expect(
			canClaimTicket(helpTicket, {
				userId: "user_it",
				permissions: [PERMISSIONS.TICKETS.RESOLVE],
			}),
		).toBe(true);
	});

	it("lets only the assignee resolve without elevate", () => {
		expect(
			canResolveTicket(ticket, {
				userId: "user_assignee",
				permissions: [PERMISSIONS.TICKETS.RESOLVE],
			}),
		).toBe(true);
		expect(
			canResolveTicket(ticket, {
				userId: "user_it",
				permissions: [PERMISSIONS.TICKETS.RESOLVE, PERMISSIONS.TICKETS.ASSIGN],
			}),
		).toBe(false);
	});

	it("lets Super Admin elevate resolve any ticket", () => {
		expect(
			canResolveTicket(ticket, {
				userId: "user_admin",
				permissions: [PERMISSIONS.PLATFORM.ELEVATE],
			}),
		).toBe(true);
	});

	it("allows close for assignee on help tickets", () => {
		const claimedHelp = {
			...helpTicket,
			assigneeCaalmUserId: "user_assignee",
		};
		expect(
			canCloseTicket(claimedHelp, {
				userId: "user_assignee",
				permissions: [PERMISSIONS.TICKETS.RESOLVE],
			}),
		).toBe(true);
	});

	it("allows escalate only on help lane", () => {
		expect(
			canEscalateTicket(helpTicket, {
				userId: "user_it",
				permissions: [PERMISSIONS.TICKETS.RESOLVE],
			}),
		).toBe(true);
		expect(
			canEscalateTicket(ticket, {
				userId: "user_assignee",
				permissions: [PERMISSIONS.TICKETS.RESOLVE],
			}),
		).toBe(false);
	});

	it("allows start fix agent only on engineering with GitHub", () => {
		expect(
			canStartFixAgent(ticket, {
				userId: "user_assignee",
				permissions: [PERMISSIONS.TICKETS.RESOLVE],
			}),
		).toBe(true);
		expect(
			canStartFixAgent(helpTicket, {
				userId: "user_assignee",
				permissions: [PERMISSIONS.TICKETS.RESOLVE],
			}),
		).toBe(false);
	});

	it("filters a mixed list to visible tickets", () => {
		const other = { ...ticket, $id: "t2", submittedByUserId: "someone-else" };
		const visible = filterVisibleTickets([ticket, other], {
			userId: "user_submitter",
			permissions: [PERMISSIONS.TICKETS.VIEW],
		});
		expect(visible.map((item) => item.$id)).toEqual(["t1"]);
	});
});
