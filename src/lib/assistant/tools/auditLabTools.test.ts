import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const scheduleReviewSession = vi.fn();
const listReviewSessions = vi.fn();
const rescheduleReviewSession = vi.fn();
const cancelReviewSession = vi.fn();
const inviteParticipants = vi.fn();

vi.mock("@/lib/audit-lab/service", () => ({
	scheduleReviewSession: (...args: unknown[]) => scheduleReviewSession(...args),
	listReviewSessions: (...args: unknown[]) => listReviewSessions(...args),
	rescheduleReviewSession: (...args: unknown[]) =>
		rescheduleReviewSession(...args),
	cancelReviewSession: (...args: unknown[]) => cancelReviewSession(...args),
	inviteParticipants: (...args: unknown[]) => inviteParticipants(...args),
}));

const { AUDIT_LAB_TOOLS } = await import("./auditLabTools");

function tool(name: string) {
	const found = AUDIT_LAB_TOOLS.find((item) => item.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "u-1", email: "user@org.test", name: "User" },
	} as unknown as Parameters<(typeof AUDIT_LAB_TOOLS)[number]["handler"]>[0];
}

describe("AUDIT_LAB_TOOLS", () => {
	beforeEach(() => {
		scheduleReviewSession.mockReset();
		listReviewSessions.mockReset();
		rescheduleReviewSession.mockReset();
		cancelReviewSession.mockReset();
		inviteParticipants.mockReset();
	});

	it("schedule_review_session blocks without audit_lab.manage_sessions", async () => {
		const res = await tool("schedule_review_session").handler(ctx([]), {
			department: "Finance",
		});
		expect(res.result).toEqual({ error: "Missing audit_lab.manage_sessions" });
		expect(scheduleReviewSession).not.toHaveBeenCalled();
	});

	it("schedule_review_session wraps the service with the caller's org", async () => {
		scheduleReviewSession.mockResolvedValue({ session: { $id: "s-1" } });
		const res = await tool("schedule_review_session").handler(
			ctx([PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS]),
			{ department: "Finance" },
		);
		expect(scheduleReviewSession).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: "org-1" }),
			expect.objectContaining({ department: "Finance" }),
		);
		expect(res.result).toEqual({ session: { $id: "s-1" } });
	});

	it("list_review_sessions blocks without audit_lab.view", async () => {
		const res = await tool("list_review_sessions").handler(ctx([]), {});
		expect(res.result).toEqual({ error: "Missing audit_lab.view" });
		expect(listReviewSessions).not.toHaveBeenCalled();
	});

	it("list_review_sessions scopes to the caller's org", async () => {
		listReviewSessions.mockResolvedValue([{ $id: "s-1" }]);
		const res = await tool("list_review_sessions").handler(
			ctx([PERMISSIONS.AUDIT_LAB.VIEW]),
			{},
		);
		expect(listReviewSessions).toHaveBeenCalledWith("org-1");
		expect(res.result).toEqual({ sessions: [{ $id: "s-1" }] });
	});

	it("reschedule_review_session calls the service with sessionId and scheduledAt", async () => {
		rescheduleReviewSession.mockResolvedValue({ session: { $id: "s-1" } });
		await tool("reschedule_review_session").handler(
			ctx([PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS]),
			{ sessionId: "s-1", scheduledAt: "2026-12-01T10:00:00.000Z" },
		);
		expect(rescheduleReviewSession).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: "org-1" }),
			"s-1",
			"2026-12-01T10:00:00.000Z",
		);
	});

	it("cancel_review_session calls the service with sessionId", async () => {
		cancelReviewSession.mockResolvedValue({ session: { $id: "s-1" } });
		await tool("cancel_review_session").handler(
			ctx([PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS]),
			{ sessionId: "s-1" },
		);
		expect(cancelReviewSession).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: "org-1" }),
			"s-1",
		);
	});

	it("invite_participants defaults role to interviewee", async () => {
		inviteParticipants.mockResolvedValue({ session: { $id: "s-1" } });
		await tool("invite_participants").handler(
			ctx([PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS]),
			{ sessionId: "s-1", userId: "u-2", name: "Bob" },
		);
		expect(inviteParticipants).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: "org-1" }),
			"s-1",
			[{ userId: "u-2", name: "Bob", role: "interviewee" }],
		);
	});
});
