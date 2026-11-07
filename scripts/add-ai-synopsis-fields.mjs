#!/usr/bin/env node
/**
 * Adds the aiSynopsis / aiSynopsisGeneratedAt columns (expiry alert "more
 * details" file view) to the files and licenses collections.
 *
 * Usage:
 *   node scripts/add-ai-synopsis-fields.mjs           # dry run
 *   node scripts/add-ai-synopsis-fields.mjs --apply
 *   node scripts/add-ai-synopsis-fields.mjs --apply --demo
 *
 * Requires NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT,
 * NEXT_APPWRITE_API_KEY, NEXT_PUBLIC_APPWRITE_DATABASE,
 * NEXT_PUBLIC_APPWRITE_FILES_COLLECTION, NEXT_PUBLIC_APPWRITE_LICENSES_COLLECTION
 * in .env.local
 */

import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const APPLY = process.argv.includes("--apply");
const INCLUDE_DEMO = process.argv.includes("--demo");

const ENDPOINT = (
	process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
	"https://fra.cloud.appwrite.io/v1"
).replace(/\/$/, "");
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const API_KEY =
	process.env.NEXT_APPWRITE_API_KEY || process.env.NEXT_APPWRITE_KEY;
const PROD_DB =
	process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
	process.env.PROD_APPWRITE_DATABASE_ID;
const DEMO_DB = "caalm-demo";

const COLLECTIONS = [
	{
		label: "files",
		tableId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION,
	},
	{
		label: "licenses",
		tableId: process.env.NEXT_PUBLIC_APPWRITE_LICENSES_COLLECTION,
	},
];

const COLUMNS = [
	{ key: "aiSynopsis", type: "string", size: 2000, required: false },
	{ key: "aiSynopsisGeneratedAt", type: "datetime", required: false },
];

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

async function getTable(databaseId, tableId) {
	try {
		return await appwrite(`/tablesdb/${databaseId}/tables/${tableId}`);
	} catch (error) {
		if (String(error.message).includes("(404)")) return null;
		throw error;
	}
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
	} else if (col.type === "datetime") {
		await appwrite(`${base}/datetime`, {
			method: "POST",
			body: { key: col.key, required: col.required, array: false },
		});
	} else {
		throw new Error(`Unsupported column type ${col.type}`);
	}
}

async function run(databaseId) {
	console.log(`\nDatabase ${databaseId} (${APPLY ? "APPLY" : "dry-run"})`);
	for (const { label, tableId } of COLLECTIONS) {
		if (!tableId) {
			console.log(`  ! missing collection id for ${label}, skipping`);
			continue;
		}
		const existing = await getTable(databaseId, tableId);
		if (!existing) {
			console.log(`  ! table ${tableId} (${label}) not found, skipping`);
			continue;
		}
		const existingCols = new Set((existing.columns || []).map((c) => c.key));
		for (const col of COLUMNS) {
			if (existingCols.has(col.key)) {
				console.log(`    = ${label}.${col.key}`);
				continue;
			}
			console.log(`    + ${label}.${col.key} (${col.type})`);
			if (APPLY) await createColumn(databaseId, tableId, col);
		}
	}
}

async function main() {
	if (!PROJECT || !API_KEY) {
		console.error(
			"Missing NEXT_PUBLIC_APPWRITE_PROJECT or NEXT_APPWRITE_API_KEY",
		);
		process.exit(1);
	}
	if (!PROD_DB) {
		console.error("Missing NEXT_PUBLIC_APPWRITE_DATABASE");
		process.exit(1);
	}
	await run(PROD_DB);
	if (INCLUDE_DEMO) await run(DEMO_DB);
	if (!APPLY) console.log("\nDry run only — pass --apply to create columns.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
