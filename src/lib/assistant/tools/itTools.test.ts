import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const listRunbooks = vi.fn();
const getRunbook = vi.fn();
const buildOrgITSnapshot = vi.fn();

vi.mock("@/lib/it/runbooks/store", () => ({
	listRunbooks: (...args: unknown[]) => listRunbooks(...args),
	getRunbook: (...args: unknown[]) => getRunbook(...args),
}));
vi.mock("@/lib/it/org-it-snapshot", () => ({
	buildOrgITSnapshot: (...args: unknown[]) => buildOrgITSnapshot(...args),
}));

const { IT_TOOLS } = await import("./itTools");

function tool(name: string) {
	const found = IT_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "user-1", email: "user@org.test", name: "Jamie" },
	} as unknown as Parameters<(typeof IT_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const runbookRow = {
	$id: "rb-1",
	title: "Appwrite outage",
	slug: "appwrite-outage",
	summary: "Steps for an Appwrite outage",
	service: "appwrite",
	severity: "high",
	status: "published",
	symptoms: [],
	steps: [
		{ title: "Check status page", body: "Open the Appwrite status page" },
		{ title: "Page on-call", body: "Notify on-call via PagerDuty" },
	],
	verification: "",
	escalation: "",
	ownerId: "o-1",
	orgId: "org-1",
	tags: [],
	integrationKeys: [],
	$createdAt: "2026-01-01T00:00:00.000Z",
	$updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("IT_TOOLS (11.3-11.4)", () => {
	beforeEach(() => {
		listRunbooks.mockReset();
		getRunbook.mockReset();
		buildOrgITSnapshot.mockReset();
	});

	describe("search_runbooks", () => {
		it("blocks without it.view_runbooks", async () => {
			const res = await tool("search_runbooks").handler(ctx([]), {
				query: "outage",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(listRunbooks).not.toHaveBeenCalled();
		});

		it("searches runbooks scoped to the org", async () => {
			listRunbooks.mockResolvedValueOnce({
				items: [runbookRow],
				storage: "appwrite",
			});
			const res = await tool("search_runbooks").handler(
				ctx([PERMISSIONS.IT.VIEW_RUNBOOKS]),
				{ query: "outage" },
			);
			expect(listRunbooks).toHaveBeenCalledWith(
				"org-1",
				expect.objectContaining({ search: "outage" }),
			);
			expect((res.result as { total: number }).total).toBe(1);
		});

		it("returns a specific step via get_step", async () => {
			getRunbook.mockResolvedValueOnce({ item: runbookRow, storage: "memory" });
			const res = await tool("search_runbooks").handler(
				ctx([PERMISSIONS.IT.VIEW_RUNBOOKS]),
				{ action: "get_step", runbookId: "rb-1", stepIndex: 1 },
			);
			expect(getRunbook).toHaveBeenCalledWith("org-1", "rb-1");
			expect((res.result as { step: { title: string } }).step.title).toBe(
				"Page on-call",
			);
		});

		it("errors when the step index is out of range", async () => {
			getRunbook.mockResolvedValueOnce({ item: runbookRow, storage: "memory" });
			const res = await tool("search_runbooks").handler(
				ctx([PERMISSIONS.IT.VIEW_RUNBOOKS]),
				{ action: "get_step", runbookId: "rb-1", stepIndex: 9 },
			);
			expect(errorOf(res)).toMatch(/only has 2 step/i);
		});
	});

	describe("get_system_health", () => {
		it("blocks without it.view_monitoring", async () => {
			const res = await tool("get_system_health").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(buildOrgITSnapshot).not.toHaveBeenCalled();
		});

		it("returns the org snapshot with its honesty notices", async () => {
			buildOrgITSnapshot.mockResolvedValueOnce({
				orgId: "org-1",
				name: "Acme",
				status: "active",
				tier: "pro",
				billingStatus: "current",
				deletionScheduledAt: null,
				users: { used: 10, limit: 50 },
				twoFactor: { enabled: 5, total: 10 },
				storage: { usedBytes: 100, limitBytes: 1000 },
				contracts: { used: 1, limit: 10 },
				licenses: { used: 1, limit: 10 },
				tickets: { open: 2, criticalOpen: 0, recent: [] },
				audit: { recent: [] },
				integrations: { hubspotStatus: null },
				notices: [
					"Host CPU and request telemetry are not configured for this tenant.",
				],
			});
			const res = await tool("get_system_health").handler(
				ctx([PERMISSIONS.IT.VIEW_MONITORING]),
				{},
			);
			expect(buildOrgITSnapshot).toHaveBeenCalledWith("org-1");
			expect((res.result as { notices: string[] }).notices[0]).toMatch(
				/host cpu/i,
			);
		});
	});
});
