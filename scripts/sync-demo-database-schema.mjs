#!/usr/bin/env node
/**
 * Keep caalm-demo schema parallel with production (685ed87c0009d8189fc7).
 *
 * Schema only: tables/collections, columns/attributes, indexes.
 * Does not copy row data.
 *
 * Usage:
 *   node scripts/sync-demo-database-schema.mjs           # dry run
 *   node scripts/sync-demo-database-schema.mjs --apply   # apply to caalm-demo
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const PROD_DB = process.env.PROD_APPWRITE_DATABASE_ID || "685ed87c0009d8189fc7";
const DEMO_DB = "caalm-demo";
const ENDPOINT = (
	process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1"
).replace(/\/$/, "");
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const API_KEY = process.env.NEXT_APPWRITE_API_KEY;

/** Prod table ID -> demo table ID when IDs intentionally differ. */
const TABLE_ID_EXCEPTIONS = {
	"69b8a208008a1f5d9b08": "push_subscriptions",
};

/** Prod relationship target -> demo target when prod still references retired collections. */
const RELATIONSHIP_TARGET_EXCEPTIONS = {
	"685ed9e90020d8f09173": "6934a3120033b4a5c4da",
};

const APPLY = process.argv.includes("--apply");

if (!PROJECT || !API_KEY) {
	console.error("Missing NEXT_PUBLIC_APPWRITE_PROJECT or NEXT_APPWRITE_API_KEY in .env.local");
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
		throw new Error(`${method} ${pathname} failed (${res.status}): ${message}`);
	}

	return json;
}

async function listAllCollections(databaseId) {
	const collections = [];
	let cursor = null;

	for (;;) {
		const queries = ['{"method":"limit","values":[100]}'];
		if (cursor) queries.push(`{"method":"cursorAfter","values":["${cursor}"]}`);

		const qs = queries.map((q) => `queries[]=${encodeURIComponent(q)}`).join("&");
		const page = await appwrite(`/databases/${databaseId}/collections?${qs}`);
		collections.push(...(page.collections || []));

		if ((page.collections || []).length < 100) break;
		cursor = page.collections[page.collections.length - 1].$id;
	}

	return collections;
}

function normalizeAttr(attr) {
	return {
		key: attr.key,
		type: attr.type,
		required: attr.required,
		array: attr.array,
		size: attr.size,
		format: attr.format,
		elements: attr.elements,
		default: attr.default,
		encrypt: attr.encrypt,
		relatedCollection: attr.relatedCollection,
		relationType: attr.relationType,
		twoWay: attr.twoWay,
		twoWayKey: attr.twoWayKey,
		onDelete: attr.onDelete,
		side: attr.side,
	};
}

function buildPlan(prodCollections, demoCollections) {
	const prodById = new Map(prodCollections.map((c) => [c.$id, c]));
	const demoById = new Map(demoCollections.map((c) => [c.$id, c]));
	const demoByName = new Map(demoCollections.map((c) => [c.name, c]));

	const plan = { createTables: [], addColumns: [], addIndexes: [] };

	const compare = (prodTable, demoTable) => {
		const demoKeys = new Set((demoTable.attributes || []).map((a) => a.key));
		for (const attr of prodTable.attributes || []) {
			if (demoKeys.has(attr.key)) continue;
			plan.addColumns.push({
				tableId: demoTable.$id,
				tableName: demoTable.name,
				attribute: normalizeAttr(attr),
			});
		}

		const demoIndexKeys = new Set((demoTable.indexes || []).map((i) => i.key));
		for (const index of prodTable.indexes || []) {
			if (demoIndexKeys.has(index.key)) continue;
			plan.addIndexes.push({
				tableId: demoTable.$id,
				tableName: demoTable.name,
				index,
			});
		}
	};

	for (const [prodId, demoIdOverride] of Object.entries(TABLE_ID_EXCEPTIONS)) {
		const prodTable = prodById.get(prodId);
		const demoTable = demoByName.get(prodTable?.name) || demoById.get(demoIdOverride);
		if (prodTable && demoTable) compare(prodTable, demoTable);
	}

	for (const prodTable of prodCollections) {
		if (TABLE_ID_EXCEPTIONS[prodTable.$id]) continue;

		const demoTable = demoById.get(prodTable.$id);
		if (!demoTable) {
			plan.createTables.push({
				tableId: prodTable.$id,
				name: prodTable.name,
				enabled: prodTable.enabled,
				rowSecurity: prodTable.documentSecurity,
				permissions: prodTable.$permissions || [],
				attributes: (prodTable.attributes || []).map(normalizeAttr),
				indexes: prodTable.indexes || [],
			});
			continue;
		}

		compare(prodTable, demoTable);
	}

	return plan;
}

async function waitForAttribute(databaseId, collectionId, key, { timeoutMs = 120000 } = {}) {
	const attempts = Math.ceil(timeoutMs / 1000);
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		const list = await appwrite(
			`/databases/${databaseId}/collections/${collectionId}/attributes`,
		);
		const attr = (list.attributes || []).find((a) => a.key === key);
		if (attr && attr.status === "available") return;
		if (attr && attr.status === "failed") {
			throw new Error(`Attribute ${key} failed: ${attr.error || "unknown"}`);
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new Error(`Timed out waiting for attribute ${key} on ${collectionId}`);
}

async function createCollection(databaseId, table) {
	await appwrite(`/databases/${databaseId}/collections`, {
		method: "POST",
		body: {
			collectionId: table.tableId,
			name: table.name,
			permissions: table.permissions,
			documentSecurity: table.rowSecurity,
			enabled: table.enabled,
		},
	});
}

async function createAttribute(databaseId, tableId, attr) {
	const base = `/databases/${databaseId}/collections/${tableId}/attributes`;

	switch (attr.type) {
		case "string": {
			const body = {
				key: attr.key,
				size: attr.size,
				required: attr.required,
				array: attr.array || false,
			};
			if (attr.default != null) body.default = attr.default;
			if (attr.encrypt != null) body.encrypt = attr.encrypt;

			if (attr.format === "email") {
				await appwrite(`${base}/email`, { method: "POST", body: { ...body, size: undefined } });
			} else if (attr.format === "enum") {
				await appwrite(`${base}/enum`, {
					method: "POST",
					body: { ...body, elements: attr.elements },
				});
			} else {
				await appwrite(`${base}/string`, { method: "POST", body });
			}
			break;
		}
		case "integer":
			await appwrite(`${base}/integer`, {
				method: "POST",
				body: {
					key: attr.key,
					required: attr.required,
					array: attr.array || false,
				},
			});
			break;
		case "boolean":
			await appwrite(`${base}/boolean`, {
				method: "POST",
				body: {
					key: attr.key,
					required: attr.required,
					array: attr.array || false,
				},
			});
			break;
		case "datetime":
			await appwrite(`${base}/datetime`, {
				method: "POST",
				body: {
					key: attr.key,
					required: attr.required,
					array: attr.array || false,
				},
			});
			break;
		case "relationship": {
			const relatedCollectionId =
				RELATIONSHIP_TARGET_EXCEPTIONS[attr.relatedCollection] ||
				attr.relatedCollection;
			await appwrite(`${base}/relationship`, {
				method: "POST",
				body: {
					key: attr.key,
					relatedCollectionId,
					type: attr.relationType,
					twoWay: attr.twoWay || false,
					twoWayKey: attr.twoWayKey,
					onDelete: attr.onDelete,
				},
			});
			break;
		}
		default:
			throw new Error(`Unsupported attribute type ${attr.type} (${attr.key})`);
	}

	await waitForAttribute(databaseId, tableId, attr.key);
}

async function createIndex(databaseId, tableId, index) {
	await appwrite(`/databases/${databaseId}/collections/${tableId}/indexes`, {
		method: "POST",
		body: {
			key: index.key,
			type: index.type,
			attributes: index.attributes,
			orders: index.orders || [],
			lengths: index.lengths || [],
		},
	});
}

async function applyPlan(plan) {
	const failures = [];

	for (const table of plan.createTables) {
		console.log(`CREATE TABLE ${table.tableId} (${table.name})`);
		try {
			if (APPLY) await createCollection(DEMO_DB, table);
			for (const attr of table.attributes) {
				console.log(`  + column ${attr.key} (${attr.type})`);
				if (APPLY) await createAttribute(DEMO_DB, table.tableId, attr);
			}
			for (const index of table.indexes) {
				console.log(`  + index ${index.key}`);
				if (APPLY) await createIndex(DEMO_DB, table.tableId, index);
			}
		} catch (error) {
			failures.push({ scope: table.tableId, error: error.message });
			console.error(`  ! failed: ${error.message}`);
		}
	}

	for (const item of plan.addColumns) {
		console.log(
			`ADD COLUMN ${item.tableName} (${item.tableId}).${item.attribute.key} [${item.attribute.type}]`,
		);
		if (!APPLY) continue;
		try {
			await createAttribute(DEMO_DB, item.tableId, item.attribute);
		} catch (error) {
			failures.push({
				scope: `${item.tableId}.${item.attribute.key}`,
				error: error.message,
			});
			console.error(`  ! failed: ${error.message}`);
		}
	}

	for (const item of plan.addIndexes) {
		console.log(`ADD INDEX ${item.tableName} (${item.tableId}).${item.index.key}`);
		if (!APPLY) continue;
		try {
			await createIndex(DEMO_DB, item.tableId, item.index);
		} catch (error) {
			failures.push({
				scope: `${item.tableId}.${item.index.key}`,
				error: error.message,
			});
			console.error(`  ! failed: ${error.message}`);
		}
	}

	return failures;
}

async function main() {
	console.log(`Source: ${PROD_DB} (caalm-dev)`);
	console.log(`Target: ${DEMO_DB}`);
	console.log(APPLY ? "Mode: APPLY" : "Mode: dry run (pass --apply to write)");
	console.log("");

	const [prodCollections, demoCollections] = await Promise.all([
		listAllCollections(PROD_DB),
		listAllCollections(DEMO_DB),
	]);

	console.log(`Prod collections: ${prodCollections.length}`);
	console.log(`Demo collections: ${demoCollections.length}`);
	console.log("");

	const plan = buildPlan(prodCollections, demoCollections);
	const summary = {
		createTables: plan.createTables.length,
		addColumns: plan.addColumns.length,
		addIndexes: plan.addIndexes.length,
	};
	console.log("Planned changes:", summary);

	if (
		summary.createTables === 0 &&
		summary.addColumns === 0 &&
		summary.addIndexes === 0
	) {
		console.log("caalm-demo schema is already in sync with production.");
		return;
	}

	console.log("");
	const failures = await applyPlan(plan);

	if (!APPLY) {
		console.log("");
		console.log("Dry run complete. Re-run with --apply to sync caalm-demo.");
		return;
	}

	console.log("");
	if (failures.length === 0) {
		console.log("Sync complete.");
		return;
	}

	console.log(`Sync finished with ${failures.length} error(s):`);
	for (const failure of failures) {
		console.log(`  - ${failure.scope}: ${failure.error}`);
	}
	process.exitCode = 1;
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
