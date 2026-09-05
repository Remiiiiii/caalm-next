#!/usr/bin/env node
/**
 * Upsert funding.* permission rows and assign them to Super Admin / Org Admin.
 *
 * Usage:
 *   node scripts/sync-funding-permissions.mjs
 *   node scripts/sync-funding-permissions.mjs --demo
 */

import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const PROD_DB =
	process.env.PROD_APPWRITE_DATABASE_ID ||
	process.env.NEXT_PUBLIC_APPWRITE_DATABASE;
if (!PROD_DB) {
	console.error("Missing PROD_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_DATABASE");
	process.exit(1);
}
const DEMO_DB = "caalm-demo";
const PERMISSIONS_TABLE =
	process.env.NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION ||
	"685ed87c0009d8189fc8";
const ROLE_PERMISSIONS_TABLE = "role_permissions";

const ENDPOINT = (
	process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ""
).replace(/\/$/, "");
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const API_KEY =
	process.env.NEXT_APPWRITE_API_KEY || process.env.NEXT_APPWRITE_KEY;
const INCLUDE_DEMO = process.argv.includes("--demo");

const FUNDING_PERMISSIONS = [
	{
		$id: "perm_funding_view",
		key: "funding.view",
		name: "View Funding & Retention",
		category: "funding",
		description:
			"See dollar-ranked retention streams and the funding pursuit pipeline",
	},
	{
		$id: "perm_funding_manage",
		key: "funding.manage",
		name: "Manage Funding & Retention",
		category: "funding",
		description:
			"Create/edit pursuits and obligations, mark wins, and spawn proposals from won bids",
	},
];

const ROLE_IDS = ["role_super_admin", "role_org_admin"];

if (!PROJECT || !API_KEY || !ENDPOINT) {
	console.error(
		"Missing NEXT_PUBLIC_APPWRITE_ENDPOINT / PROJECT or NEXT_APPWRITE_API_KEY",
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
		throw new Error(
			`${method} ${pathname} failed (${res.status}): ${json.message || text}`,
		);
	}
	return json;
}

async function getRow(databaseId, tableId, rowId) {
	try {
		return await appwrite(
			`/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`,
		);
	} catch (error) {
		if (String(error.message).includes("(404)")) return null;
		throw error;
	}
}

async function findPermissionByKey(databaseId, key) {
	const qKey = encodeURIComponent(
		JSON.stringify({ method: "equal", attribute: "key", values: [key] }),
	);
	const qLimit = encodeURIComponent(
		JSON.stringify({ method: "limit", values: [1] }),
	);
	const list = await appwrite(
		`/tablesdb/${databaseId}/tables/${PERMISSIONS_TABLE}/rows?queries[]=${qKey}&queries[]=${qLimit}`,
	);
	return (list.rows || [])[0] || null;
}

async function upsertPermission(databaseId, permission) {
	const byId = await getRow(databaseId, PERMISSIONS_TABLE, permission.$id);
	if (byId) {
		console.log(`  permission exists: ${permission.key} (${permission.$id})`);
		return permission.$id;
	}
	const byKey = await findPermissionByKey(databaseId, permission.key);
	if (byKey) {
		console.log(
			`  permission exists by key: ${permission.key} (${byKey.$id})`,
		);
		return byKey.$id;
	}
	await appwrite(`/tablesdb/${databaseId}/tables/${PERMISSIONS_TABLE}/rows`, {
		method: "POST",
		body: {
			rowId: permission.$id,
			data: {
				key: permission.key,
				name: permission.name,
				category: permission.category,
				description: permission.description,
			},
			permissions: ['read("users")', 'update("users")'],
		},
	});
	console.log(`  + permission ${permission.key}`);
	return permission.$id;
}

async function ensureRolePermission(databaseId, roleId, permissionId) {
	const qRole = encodeURIComponent(
		JSON.stringify({ method: "equal", attribute: "roleId", values: [roleId] }),
	);
	const qPerm = encodeURIComponent(
		JSON.stringify({
			method: "equal",
			attribute: "permissionId",
			values: [permissionId],
		}),
	);
	const qLimit = encodeURIComponent(
		JSON.stringify({ method: "limit", values: [1] }),
	);
	const list = await appwrite(
		`/tablesdb/${databaseId}/tables/${ROLE_PERMISSIONS_TABLE}/rows?queries[]=${qRole}&queries[]=${qPerm}&queries[]=${qLimit}`,
	);
	if ((list.rows || []).length > 0) {
		console.log(`  role_permission exists: ${roleId} -> ${permissionId}`);
		return;
	}
	// TablesDB requires an explicit rowId when creating a single row.
	const rowId = `rp_${roleId}_${permissionId}`.slice(0, 36);
	await appwrite(
		`/tablesdb/${databaseId}/tables/${ROLE_PERMISSIONS_TABLE}/rows`,
		{
			method: "POST",
			body: {
				rowId,
				data: { roleId, permissionId },
				permissions: ['read("users")'],
			},
		},
	);
	console.log(`  + role_permission ${roleId} -> ${permissionId}`);
}

async function syncDatabase(databaseId) {
	console.log(`\nSync funding permissions in ${databaseId}`);
	for (const permission of FUNDING_PERMISSIONS) {
		const permissionId = await upsertPermission(databaseId, permission);
		for (const roleId of ROLE_IDS) {
			await ensureRolePermission(databaseId, roleId, permissionId);
		}
	}
}

await syncDatabase(PROD_DB);
if (INCLUDE_DEMO) await syncDatabase(DEMO_DB);
console.log("\nFunding permissions sync complete.");
