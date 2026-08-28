#!/usr/bin/env node
/**
 * Provision contract template + guided wizard Appwrite tables (prod + optional demo).
 *
 * Table IDs are alphanumeric (Appwrite requirement). Human labels live in `name`.
 *
 * Usage:
 *   node scripts/provision-contract-templates-schema.mjs           # dry run
 *   node scripts/provision-contract-templates-schema.mjs --apply
 *   node scripts/provision-contract-templates-schema.mjs --apply --demo
 */

import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const APPLY = process.argv.includes("--apply");
const INCLUDE_DEMO = process.argv.includes("--demo");

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
	/\/$/,
	"",
);
if (!ENDPOINT) {
	console.error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT in .env.local");
	process.exit(1);
}
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const API_KEY =
	process.env.NEXT_APPWRITE_API_KEY || process.env.NEXT_APPWRITE_KEY;
const PROD_DB =
	process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
	process.env.PROD_APPWRITE_DATABASE_ID;
if (!PROD_DB) {
	console.error(
		"Missing NEXT_PUBLIC_APPWRITE_DATABASE or PROD_APPWRITE_DATABASE_ID",
	);
	process.exit(1);
}
const DEMO_DB = "caalm-demo";

const TABLES = [
	{
		tableId: "69c8f501001a2b3c4d02",
		name: "contract_templates",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "name", type: "string", size: 256, required: true },
			{ key: "description", type: "string", size: 2000, required: false },
			{ key: "contractType", type: "string", size: 64, required: true },
			{
				key: "status",
				type: "enum",
				elements: ["draft", "published", "archived"],
				required: true,
			},
			{ key: "clauseSlots", type: "string", size: 16384, required: true },
			{ key: "createdBy", type: "string", size: 64, required: true },
			{ key: "updatedBy", type: "string", size: 64, required: true },
		],
		indexes: [
			{ key: "idx_templates_org", type: "key", attributes: ["orgId"] },
			{
				key: "idx_templates_org_status",
				type: "key",
				attributes: ["orgId", "status"],
			},
		],
	},
	{
		tableId: "69c8f502002b3c4d5e03",
		name: "contract_wizard_sessions",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "userId", type: "string", size: 64, required: true },
			{
				key: "status",
				type: "enum",
				elements: ["in_progress", "submitted", "abandoned"],
				required: true,
			},
			{ key: "currentStep", type: "integer", required: true },
			{ key: "payload", type: "string", size: 16384, required: true },
			{ key: "templateId", type: "string", size: 64, required: false },
			{ key: "contractId", type: "string", size: 64, required: false },
		],
		indexes: [
			{
				key: "idx_wizard_org_user",
				type: "key",
				attributes: ["orgId", "userId"],
			},
			{
				key: "idx_wizard_status",
				type: "key",
				attributes: ["orgId", "status"],
			},
		],
	},
];

if (!PROJECT || !API_KEY) {
	console.error(
		"Missing NEXT_PUBLIC_APPWRITE_PROJECT or NEXT_APPWRITE_API_KEY in .env.local",
	);
	process.exit(1);
}

async function appwrite(pathname, { method = "GET", body } = {}) {
	const res = await fetch(`${ENDPOINT}${pathname}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			"X-Appwrite-Project": PROJECT,
			"X-Appwrite-Key": API_KEY,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	let json;
	try {
		json = text ? JSON.parse(text) : {};
	} catch {
		json = { message: text };
	}
	if (!res.ok) {
		const message = json.message || json.error || text || res.statusText;
		const err = new Error(
			`${method} ${pathname} failed (${res.status}): ${message}`,
		);
		err.status = res.status;
		throw err;
	}
	return json;
}

async function tableExists(databaseId, tableId) {
	try {
		await appwrite(`/tablesdb/${databaseId}/tables/${tableId}`);
		return true;
	} catch (error) {
		if (String(error.message).includes("(404)")) return false;
		throw error;
	}
}

async function createTable(databaseId, table) {
	await appwrite(`/tablesdb/${databaseId}/tables`, {
		method: "POST",
		body: {
			tableId: table.tableId,
			name: table.name,
			permissions: [
				'read("users")',
				'create("users")',
				'update("users")',
				'delete("users")',
			],
			rowSecurity: false,
			enabled: true,
		},
	});
}

async function createColumn(databaseId, tableId, col) {
	const base = `/tablesdb/${databaseId}/tables/${tableId}/columns`;
	if (col.type === "string") {
		await appwrite(`${base}/string`, {
			method: "POST",
			body: {
				key: col.key,
				size: col.size,
				required: col.required,
				array: false,
			},
		});
	} else if (col.type === "float") {
		await appwrite(`${base}/float`, {
			method: "POST",
			body: { key: col.key, required: col.required, array: false },
		});
	} else if (col.type === "integer") {
		await appwrite(`${base}/integer`, {
			method: "POST",
			body: { key: col.key, required: col.required, array: false },
		});
	} else if (col.type === "boolean") {
		// Appwrite rejects default when required=true.
		const body = {
			key: col.key,
			required: col.required,
			array: false,
		};
		if (!col.required) body.default = false;
		await appwrite(`${base}/boolean`, {
			method: "POST",
			body,
		});
	} else if (col.type === "datetime") {
		await appwrite(`${base}/datetime`, {
			method: "POST",
			body: { key: col.key, required: col.required, array: false },
		});
	} else if (col.type === "enum") {
		await appwrite(`${base}/enum`, {
			method: "POST",
			body: {
				key: col.key,
				elements: col.elements,
				required: col.required,
				array: false,
			},
		});
	} else {
		throw new Error(`Unsupported column type ${col.type}`);
	}
}

async function createIndex(databaseId, tableId, index) {
	const columns = index.attributes || index.columns;
	// Prefer TablesDB path; fall back to legacy Databases collections API.
	try {
		await appwrite(`/tablesdb/${databaseId}/tables/${tableId}/indexes`, {
			method: "POST",
			body: {
				key: index.key,
				type: index.type,
				columns,
			},
		});
	} catch (error) {
		await appwrite(`/databases/${databaseId}/collections/${tableId}/indexes`, {
			method: "POST",
			body: {
				key: index.key,
				type: index.type,
				attributes: columns,
			},
		});
	}
}

async function getTable(databaseId, tableId) {
	try {
		return await appwrite(`/tablesdb/${databaseId}/tables/${tableId}`);
	} catch (error) {
		if (String(error.message).includes("(404)")) return null;
		throw error;
	}
}

async function provisionDatabase(databaseId) {
	console.log(`\nDatabase ${databaseId} (${APPLY ? "APPLY" : "dry-run"})`);
	for (const table of TABLES) {
		let existing = await getTable(databaseId, table.tableId);
		if (!existing) {
			console.log(`  + create table ${table.tableId} (${table.name})`);
			if (!APPLY) continue;
			await createTable(databaseId, table);
			existing = { columns: [], indexes: [] };
		} else {
			console.log(`  = table exists ${table.tableId} (${table.name})`);
		}

		const existingCols = new Set((existing.columns || []).map((c) => c.key));
		for (const col of table.columns) {
			if (existingCols.has(col.key)) {
				console.log(`    = column ${col.key}`);
				continue;
			}
			console.log(`    + column ${col.key} (${col.type})`);
			if (!APPLY) continue;
			await createColumn(databaseId, table.tableId, col);
			await new Promise((r) => setTimeout(r, 400));
		}

		const existingIndexes = new Set((existing.indexes || []).map((i) => i.key));
		for (const index of table.indexes) {
			if (existingIndexes.has(index.key)) {
				console.log(`    = index ${index.key}`);
				continue;
			}
			console.log(`    + index ${index.key}`);
			if (!APPLY) continue;
			try {
				await createIndex(databaseId, table.tableId, index);
			} catch (error) {
				console.warn(`      ! index skipped: ${error.message}`);
			}
		}
	}
}

await provisionDatabase(PROD_DB);
if (INCLUDE_DEMO) {
	await provisionDatabase(DEMO_DB);
}

console.log(
	APPLY
		? "\nDone. Env defaults already point at 69c8f501001a2b3c4d02 / 69c8f502002b3c4d5e03."
		: "\nDry run only. Re-run with --apply to create tables.",
);
