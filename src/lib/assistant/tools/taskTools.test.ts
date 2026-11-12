import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getTask = vi.fn();
const listTasks = vi.fn();
const updateTask = vi.fn();
const createTask = vi.fn();
const deleteTask = vi.fn();
const getFinding = vi.fn();
const searchLicensesTable = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/api/tasks/services/TaskService", () => ({
	TaskService: {
		getTask: (...args: unknown[]) => getTask(...args),
		listTasks: (...args: unknown[]) => listTasks(...args),
		updateTask: (...args: unknown[]) => updateTask(...args),
		createTask: (...args: unknown[]) => createTask(...args),
		deleteTask: (...args: unknown[]) => deleteTask(...args),
	},
}));
vi.mock("@/lib/audit-upload/store", () => ({
	getFinding: (...args: unknown[]) => getFinding(...args),
}));
vi.mock("@/lib/assistant/tools/toolUtils", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/assistant/tools/toolUtils")
	>("@/lib/assistant/tools/toolUtils");
	return {
		...actual,
		searchLicensesTable: (...args: unknown[]) => searchLicensesTable(...args),
	};
});
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { TASK_TOOLS } = await import("./taskTools");

function tool(name: string) {
	const found = TASK_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "admin-1", email: "admin@org.test", name: "Admin" },
	} as unknown as Parameters<(typeof TASK_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const taskRow = {
	$id: "t-1",
	orgId: "org-1",
	title: "Review the renewal",
	status: "not_started",
	priority: "medium",
	dueDate: "2020-01-01",
};

describe("TASK_TOOLS (10.1-10.4)", () => {
	beforeEach(() => {
		getTask.mockReset();
		listTasks.mockReset();
		updateTask.mockReset();
		createTask.mockReset();
		deleteTask.mockReset();
		getFinding.mockReset();
		searchLicensesTable.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("update_task", () => {
		it("blocks without events.create", async () => {
			const res = await tool("update_task").handler(ctx([]), {
				taskId: "t-1",
				newTitle: "New",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(updateTask).not.toHaveBeenCalled();
		});

		it("requires at least one field to change", async () => {
			getTask.mockResolvedValueOnce(taskRow);
			const res = await tool("update_task").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ taskId: "t-1" },
			);
			expect(errorOf(res)).toMatch(/give at least one field/i);
			expect(updateTask).not.toHaveBeenCalled();
		});

		it("resolves by title when multiple match", async () => {
			listTasks.mockResolvedValueOnce({
				tasks: [taskRow, { ...taskRow, $id: "t-2", title: "Review gift" }],
				total: 2,
			});
			const res = await tool("update_task").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ title: "Review", newTitle: "New" },
			);
			expect(errorOf(res)).toMatch(/found 2 tasks/i);
			expect(updateTask).not.toHaveBeenCalled();
		});

		it("updates the task and audits", async () => {
			getTask.mockResolvedValueOnce(taskRow);
			updateTask.mockResolvedValueOnce({ ...taskRow, priority: "high" });
			const res = await tool("update_task").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ taskId: "t-1", priority: "high" },
			);
			expect(updateTask).toHaveBeenCalledWith(
				"org-1",
				"t-1",
				expect.objectContaining({ priority: "high" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { task: { priority: string } }).task.priority).toBe(
				"high",
			);
		});
	});

	describe("list_my_tasks", () => {
		it("blocks without events.create", async () => {
			const res = await tool("list_my_tasks").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(listTasks).not.toHaveBeenCalled();
		});

		it("scopes to the caller's assigneeId", async () => {
			listTasks.mockResolvedValueOnce({ tasks: [taskRow], total: 1 });
			const res = await tool("list_my_tasks").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{},
			);
			expect(listTasks).toHaveBeenCalledWith(
				"org-1",
				expect.objectContaining({ assigneeId: "admin-1" }),
				expect.any(Object),
			);
			expect((res.result as { total: number }).total).toBe(1);
		});

		it("filters to overdue only when asked", async () => {
			listTasks.mockResolvedValueOnce({
				tasks: [taskRow, { ...taskRow, $id: "t-2", dueDate: "2099-01-01" }],
				total: 2,
			});
			const res = await tool("list_my_tasks").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ overdueOnly: true },
			);
			expect((res.result as { total: number }).total).toBe(1);
		});
	});

	describe("create_task_for_finding", () => {
		it("blocks without events.create", async () => {
			const res = await tool("create_task_for_finding").handler(ctx([]), {
				title: "Follow up",
				findingId: "f-1",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(createTask).not.toHaveBeenCalled();
		});

		it("requires either a license or a finding link", async () => {
			const res = await tool("create_task_for_finding").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ title: "Follow up" },
			);
			expect(errorOf(res)).toMatch(/licenseId\/licenseName/i);
			expect(createTask).not.toHaveBeenCalled();
		});

		it("errors when the finding doesn't exist in this org", async () => {
			getFinding.mockResolvedValueOnce(null);
			const res = await tool("create_task_for_finding").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ title: "Follow up", findingId: "f-1" },
			);
			expect(errorOf(res)).toMatch(/no audit finding found/i);
			expect(createTask).not.toHaveBeenCalled();
		});

		it("creates a task linked to a finding and audits", async () => {
			getFinding.mockResolvedValueOnce({ $id: "f-1", title: "Access gap" });
			createTask.mockResolvedValueOnce({ $id: "task-1", title: "Follow up" });
			const res = await tool("create_task_for_finding").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ title: "Follow up", findingId: "f-1" },
			);
			expect(createTask).toHaveBeenCalledWith(
				"org-1",
				"admin-1",
				expect.objectContaining({
					linkedEntityType: "audit",
					linkedEntityId: "f-1",
				}),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect(
				(res.result as { linkedEntityType: string }).linkedEntityType,
			).toBe("audit");
		});

		it("creates a task linked to a license found by name", async () => {
			searchLicensesTable.mockResolvedValueOnce([
				{ id: "lic-1", name: "Microsoft 365" },
			]);
			createTask.mockResolvedValueOnce({ $id: "task-2", title: "Renew" });
			const res = await tool("create_task_for_finding").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ title: "Renew", licenseName: "Microsoft" },
			);
			expect(createTask).toHaveBeenCalledWith(
				"org-1",
				"admin-1",
				expect.objectContaining({
					linkedEntityType: "license",
					linkedEntityId: "lic-1",
				}),
			);
			expect((res.result as { linked: string }).linked).toBe("Microsoft 365");
		});
	});

	describe("cancel_task", () => {
		it("blocks without events.create", async () => {
			const res = await tool("cancel_task").handler(ctx([]), {
				taskId: "t-1",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(deleteTask).not.toHaveBeenCalled();
		});

		it("errors when no task matches", async () => {
			listTasks.mockResolvedValueOnce({ tasks: [], total: 0 });
			const res = await tool("cancel_task").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ title: "Nonexistent" },
			);
			expect(errorOf(res)).toMatch(/couldn't find a task/i);
		});

		it("soft-deletes the task and audits", async () => {
			getTask.mockResolvedValueOnce(taskRow);
			deleteTask.mockResolvedValueOnce({ ...taskRow, deletedAt: "now" });
			const res = await tool("cancel_task").handler(
				ctx([PERMISSIONS.EVENTS.CREATE]),
				{ taskId: "t-1" },
			);
			expect(deleteTask).toHaveBeenCalledWith("org-1", "t-1");
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { cancelled: boolean }).cancelled).toBe(true);
		});
	});
});
