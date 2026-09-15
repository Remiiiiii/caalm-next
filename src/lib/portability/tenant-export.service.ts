import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getOrgExportCatalog,
	type OrgExportEntry,
	type OrgExportOrgField,
} from "@/lib/portability/org-export-catalog";

export const TENANT_EXPORT_SCHEMA_VERSION = 1;
export const ORGANIZATIONS_TABLE_ID = "organizations";

export type TenantExportManifestEntry = {
	count: number;
	tableId: string;
	orgField: OrgExportOrgField | "$id";
	error?: string;
};

export type TenantExportPayload = {
	schemaVersion: number;
	exportedAt: string;
	orgId: string;
	organization: Record<string, unknown> | null;
	manifest: Record<string, TenantExportManifestEntry>;
	collections: Record<string, unknown[]>;
};

export type TenantExportTablesDb = {
	listRows: (args: {
		databaseId: string;
		tableId: string;
		queries: string[];
	}) => Promise<{ rows: Array<Record<string, unknown> & { $id: string }> }>;
	getRow: (args: {
		databaseId: string;
		tableId: string;
		rowId: string;
	}) => Promise<Record<string, unknown>>;
};

const DEFAULT_PAGE_SIZE = 100;

export function tenantExportFilename(orgId: string, exportedAt: string): string {
	const stamp = exportedAt.replace(/[:.]/g, "-");
	return `caalm-tenant-export-${orgId}-${stamp}.json`;
}

export function manifestMatchesCollections(
	payload: TenantExportPayload,
): boolean {
	return Object.entries(payload.manifest).every(([key, entry]) => {
		if (entry.error) return true;
		return (payload.collections[key]?.length ?? 0) === entry.count;
	});
}

async function resolveTablesDb(
	tablesDB?: TenantExportTablesDb,
): Promise<TenantExportTablesDb> {
	if (tablesDB) return tablesDB;
	const admin = await createAdminClient();
	return admin.tablesDB as TenantExportTablesDb;
}

export async function listAllOrgRows(
	tablesDB: TenantExportTablesDb,
	tableId: string,
	orgField: OrgExportOrgField,
	orgId: string,
	pageSize = DEFAULT_PAGE_SIZE,
): Promise<unknown[]> {
	const databaseId = appwriteConfig.databaseId || "default-db";
	const rows: unknown[] = [];
	let cursor: string | undefined;

	for (;;) {
		const queries = [
			Query.equal(orgField, orgId),
			Query.limit(pageSize),
		];
		if (cursor) queries.push(Query.cursorAfter(cursor));

		const batch = await tablesDB.listRows({
			databaseId,
			tableId,
			queries,
		});

		if (batch.rows.length === 0) break;
		rows.push(...batch.rows);
		if (batch.rows.length < pageSize) break;
		cursor = batch.rows[batch.rows.length - 1].$id;
	}

	return rows;
}

export async function buildTenantExport(
	orgId: string,
	options?: {
		tablesDB?: TenantExportTablesDb;
		catalog?: OrgExportEntry[];
		now?: Date;
	},
): Promise<TenantExportPayload> {
	const tablesDB = await resolveTablesDb(options?.tablesDB);
	const catalog = options?.catalog ?? getOrgExportCatalog();
	const exportedAt = (options?.now ?? new Date()).toISOString();
	const databaseId = appwriteConfig.databaseId || "default-db";

	let organization: Record<string, unknown> | null = null;
	const manifest: Record<string, TenantExportManifestEntry> = {};
	const collections: Record<string, unknown[]> = {};

	try {
		organization = await tablesDB.getRow({
			databaseId,
			tableId: ORGANIZATIONS_TABLE_ID,
			rowId: orgId,
		});
		manifest.organization = {
			count: 1,
			tableId: ORGANIZATIONS_TABLE_ID,
			orgField: "$id",
		};
		collections.organization = [organization];
	} catch (error) {
		manifest.organization = {
			count: 0,
			tableId: ORGANIZATIONS_TABLE_ID,
			orgField: "$id",
			error: error instanceof Error ? error.message : "Organization not found",
		};
		collections.organization = [];
	}

	for (const entry of catalog) {
		try {
			const rows = await listAllOrgRows(
				tablesDB,
				entry.tableId,
				entry.orgField,
				orgId,
			);
			manifest[entry.key] = {
				count: rows.length,
				tableId: entry.tableId,
				orgField: entry.orgField,
			};
			collections[entry.key] = rows;
		} catch (error) {
			manifest[entry.key] = {
				count: 0,
				tableId: entry.tableId,
				orgField: entry.orgField,
				error: error instanceof Error ? error.message : "Export failed",
			};
			collections[entry.key] = [];
		}
	}

	return {
		schemaVersion: TENANT_EXPORT_SCHEMA_VERSION,
		exportedAt,
		orgId,
		organization,
		manifest,
		collections,
	};
}
