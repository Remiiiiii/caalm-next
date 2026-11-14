import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const listUsersForManagement = vi.fn();
const updateUserProfile = vi.fn();
const getAuditLogs = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/actions/user.actions", () => ({
	listUsersForManagement: (...args: unknown[]) =>
		listUsersForManagement(...args),
	updateUserProfile: (...args: unknown[]) => updateUserProfile(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	getAuditLogs: (...args: unknown[]) => getAuditLogs(...args),
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { AGENT_OS_TOOLS } = await import("./agentOsTools");

function tool(name: string) {
	const found = AGENT_OS_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "user-1", email: "user@org.test", name: "Jamie" },
	} as unknown as Parameters<(typeof AGENT_OS_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

describe("AGENT_OS_TOOLS (15.1-15.5)", () => {
	beforeEach(() => {
		listUsersForManagement.mockReset();
		updateUserProfile.mockReset();
		getAuditLogs.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("preview_mutation", () => {
		it("blocks without ai.chat", async () => {
			const res = await tool("preview_mutation").handler(ctx([]), {
				toolName: "deactivate_user",
			});
			expect(errorOf(res)).toMatch(/permission/i);
		});

		it("refuses to preview a tool the caller can't run", async () => {
			const res = await tool("preview_mutation").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{ toolName: "deactivate_user" },
			);
			expect(errorOf(res)).toMatch(/can't run/i);
		});

		it("refuses to preview a non-mutating tool", async () => {
			const res = await tool("preview_mutation").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{ toolName: "list_my_capabilities" },
			);
			expect(errorOf(res)).toMatch(/doesn't change anything/i);
		});

		it("previews a mutating tool without running it", async () => {
			const res = await tool("preview_mutation").handler(
				ctx([PERMISSIONS.AI.CHAT, PERMISSIONS.USERS.DEACTIVATE]),
				{ toolName: "deactivate_user", args: { userEmail: "a@b.com" } },
			);
			const result = res.result as { note: string; toolName: string };
			expect(result.toolName).toBe("deactivate_user");
			expect(result.note).toMatch(/nothing has been changed/i);
			expect(updateUserProfile).not.toHaveBeenCalled();
		});
	});

	describe("undo_last_action", () => {
		it("blocks without users.deactivate", async () => {
			const res = await tool("undo_last_action").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(getAuditLogs).not.toHaveBeenCalled();
		});

		it("honestly reports nothing undoable when no reversible action exists", async () => {
			getAuditLogs.mockResolvedValueOnce([]);
			const res = await tool("undo_last_action").handler(
				ctx([PERMISSIONS.USERS.DEACTIVATE]),
				{},
			);
			expect(errorOf(res)).toMatch(/safely undo/i);
			expect(updateUserProfile).not.toHaveBeenCalled();
		});

		it("refuses to undo a stale action whose status already changed", async () => {
			getAuditLogs.mockResolvedValueOnce([
				{
					event_id: "ev-1",
					event_title: "Assistant deactivated Jamie",
					target_type: "user",
					target_id: "u-1",
					action: "update",
					metadata: {
						source: "ai_assistant",
						previousStatus: "active",
						nextStatus: "inactive",
					},
				},
			]);
			listUsersForManagement.mockResolvedValueOnce([
				{ $id: "u-1", accountId: "acc-1", status: "active", fullName: "Jamie" },
			]);
			const res = await tool("undo_last_action").handler(
				ctx([PERMISSIONS.USERS.DEACTIVATE]),
				{},
			);
			expect(errorOf(res)).toMatch(/status has changed/i);
			expect(updateUserProfile).not.toHaveBeenCalled();
		});

		it("reverses the last reactivate/deactivate toggle and audits it", async () => {
			getAuditLogs.mockResolvedValueOnce([
				{
					event_id: "ev-1",
					event_title: "Assistant deactivated Jamie",
					target_type: "user",
					target_id: "u-1",
					action: "update",
					metadata: {
						source: "ai_assistant",
						previousStatus: "active",
						nextStatus: "inactive",
					},
				},
			]);
			listUsersForManagement.mockResolvedValueOnce([
				{
					$id: "u-1",
					accountId: "acc-1",
					status: "inactive",
					fullName: "Jamie",
				},
			]);
			updateUserProfile.mockResolvedValueOnce({ user: { $id: "u-1" } });
			const res = await tool("undo_last_action").handler(
				ctx([PERMISSIONS.USERS.DEACTIVATE]),
				{},
			);
			expect(updateUserProfile).toHaveBeenCalledWith(
				expect.objectContaining({ accountId: "acc-1", status: "active" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { status: string }).status).toBe("active");
		});
	});

	describe("explain_why_denied", () => {
		it("names the missing permission in plain English without granting it", async () => {
			const res = await tool("explain_why_denied").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{ toolName: "deactivate_user" },
			);
			const result = res.result as { denied: boolean; message: string };
			expect(result.denied).toBe(true);
			expect(result.message).toMatch(/ask your org admin/i);
		});

		it("reports no denial when the caller already has the permission", async () => {
			const res = await tool("explain_why_denied").handler(
				ctx([PERMISSIONS.AI.CHAT, PERMISSIONS.USERS.DEACTIVATE]),
				{ toolName: "deactivate_user" },
			);
			expect((res.result as { denied: boolean }).denied).toBe(false);
		});
	});

	describe("list_my_capabilities", () => {
		it("only lists tools the caller's own permissions allow", async () => {
			const res = await tool("list_my_capabilities").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{},
			);
			const result = res.result as { capabilities: Array<{ name: string }> };
			const names = result.capabilities.map((c) => c.name);
			expect(names).toContain("list_my_capabilities");
			expect(names).not.toContain("deactivate_user");
		});
	});

	describe("compose_skill_multi_step", () => {
		it("refuses an undefined skill name honestly", async () => {
			const res = await tool("compose_skill_multi_step").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{ skillName: "launch_rocket" },
			);
			expect(errorOf(res)).toMatch(/isn't a defined skill/i);
		});

		it("blocks the whole skill up front when a step permission is missing", async () => {
			const res = await tool("compose_skill_multi_step").handler(ctx([]), {
				skillName: "create_and_assign_ticket",
				title: "x",
				description: "y",
			});
			expect(errorOf(res)).toMatch(/can't run/i);
		});
	});
});
