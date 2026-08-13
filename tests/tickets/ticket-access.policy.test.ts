import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import {
	canResolveTicket,
	canViewTicket,
	filterVisibleTickets,
} from "@/lib/tickets/ticket-access.policy";
import type { Ticket } from "@/lib/tickets/ticket.types";

const ticket: Ticket = {
	$id: "t1",
	title: "Broken login",
	description: "SSO fails",
	submittedByUserId: "user_submitter",
	submittedByName: "Ada",
	department: "Legal",
	submittedAt: "2026-08-12T00:00:00.000Z",
	severity: "high",
	status: "ASSIGNED",
	orgId: "org_1",
	assigneeCaalmUserId: "user_assignee",
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

	it("filters a mixed list to visible tickets", () => {
		const other = { ...ticket, $id: "t2", submittedByUserId: "someone-else" };
		const visible = filterVisibleTickets([ticket, other], {
			userId: "user_submitter",
			permissions: [PERMISSIONS.TICKETS.VIEW],
		});
		expect(visible.map((item) => item.$id)).toEqual(["t1"]);
	});
});
