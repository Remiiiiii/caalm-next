import { Query } from "node-appwrite";
import { describe, expect, it } from "vitest";
import { getOrgExportCatalog } from "@/lib/portability/org-export-catalog";
import {
	buildTenantExport,
	listAllOrgRows,
	manifestMatchesCollections,
	TENANT_EXPORT_SCHEMA_VERSION,
	type TenantExportTablesDb,
} from "@/lib/portability/tenant-export.service";
import { getCatalogTaskLinkedPrNumber } from "@/lib/roadmap/catalog";

function row(id: string, extra: Record<string, unknown> = {}) {
	return { $id: id, ...extra };
}

function createMockTablesDb(options?: {
	pagesByTable?: Record<string, Array<Array<ReturnType<typeof row>>>>;
	errorsByTable?: Record<string, string>;
	organization?: Record<string, unknown> | null;
}): TenantExportTablesDb {
	const pagesByTable = options?.pagesByTable ?? {};
	const errorsByTable = options?.errorsByTable ?? {};
	const cursors = new Map<string, number>();

	return {
		async getRow({ tableId, rowId }) {
			if (tableId === "organizations") {
				if (options?.organization === null) {
					throw new Error("Organization not found");
				}
				return options?.organization ?? { $id: rowId, name: "Acme" };
			}
			throw new Error(`Unexpected getRow ${tableId}`);
		},
		async listRows({ tableId, queries }) {
			if (errorsByTable[tableId]) {
				throw new Error(errorsByTable[tableId]);
			}
			const pages = pagesByTable[tableId] ?? [[]];
			const pageIndex = cursors.get(tableId) ?? 0;
			cursors.set(tableId, pageIndex + 1);
			const usedCursor = queries.some((query) =>
				String(query).includes("cursorAfter"),
			);
			if (usedCursor && pageIndex === 0) {
				cursors.set(tableId, 2);
				return { rows: pages[1] ?? [] };
			}
			return { rows: pages[pageIndex] ?? [] };
		},
	};
}

describe("13.1 tenant data export", () => {
	it("keeps catalog keys unique and org-scoped", () => {
		const catalog = getOrgExportCatalog();
		const keys = catalog.map((entry) => entry.key);
		expect(keys).toEqual([...new Set(keys)]);
		expect(catalog.some((entry) => entry.key === "contracts")).toBe(true);
		expect(catalog.some((entry) => entry.key === "files")).toBe(true);
		expect(
			catalog.find((entry) => entry.key === "sharedCalendars")?.orgField,
		).toBe("organizationId");
		expect(catalog.some((entry) => entry.tableId === "permissions")).toBe(
			false,
		);
	});

	it("pages org-filtered rows and counts match the collected array", async () => {
		const tablesDB = createMockTablesDb({
			pagesByTable: {
				"test-contracts": [
					[row("c1", { orgId: "org-1" }), row("c2", { orgId: "org-1" })],
					[row("c3", { orgId: "org-1" })],
				],
			},
		});

		const rows = await listAllOrgRows(
			tablesDB,
			"test-contracts",
			"orgId",
			"org-1",
			2,
		);
		expect(rows).toHaveLength(3);
	});

	it("builds a payload whose manifest counts match collection lengths", async () => {
		const catalog = [
			{
				key: "contracts",
				tableId: "contracts-table",
				orgField: "orgId" as const,
			},
			{
				key: "sharedCalendars",
				tableId: "calendars-table",
				orgField: "organizationId" as const,
			},
			{ key: "broken", tableId: "missing-table", orgField: "orgId" as const },
		];
		const queriesSeen: string[][] = [];
		const tablesDB: TenantExportTablesDb = {
			async getRow({ rowId }) {
				return { $id: rowId, name: "Acme Health" };
			},
			async listRows({ tableId, queries }) {
				queriesSeen.push(queries.map(String));
				if (tableId === "missing-table") {
					throw new Error("Collection not found");
				}
				if (tableId === "contracts-table") {
					return {
						rows: [
							row("c1", { orgId: "org-1" }),
							row("c2", { orgId: "org-1" }),
						],
					};
				}
				if (tableId === "calendars-table") {
					return { rows: [row("cal1", { organizationId: "org-1" })] };
				}
				return { rows: [] };
			},
		};

		const payload = await buildTenantExport("org-1", {
			tablesDB,
			catalog,
			now: new Date("2026-09-14T12:00:00.000Z"),
		});

		expect(payload.schemaVersion).toBe(TENANT_EXPORT_SCHEMA_VERSION);
		expect(payload.orgId).toBe("org-1");
		expect(payload.organization).toMatchObject({
			$id: "org-1",
			name: "Acme Health",
		});
		expect(payload.manifest.contracts.count).toBe(2);
		expect(payload.collections.contracts).toHaveLength(2);
		expect(payload.manifest.sharedCalendars.count).toBe(1);
		expect(payload.collections.sharedCalendars).toHaveLength(1);
		expect(payload.manifest.broken.error).toMatch(/Collection not found/);
		expect(payload.collections.broken).toEqual([]);
		expect(manifestMatchesCollections(payload)).toBe(true);

		const joined = queriesSeen.flat().join(" ");
		expect(joined).toContain(Query.equal("orgId", "org-1"));
		expect(joined).toContain(Query.equal("organizationId", "org-1"));
	});

	it("binds 13.1 to catalog PR 77", () => {
		expect(getCatalogTaskLinkedPrNumber("13.1")).toBe(77);
	});
});
