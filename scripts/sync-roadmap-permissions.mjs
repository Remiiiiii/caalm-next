#!/usr/bin/env node
/**
 * Upsert CLM roadmap permission rows and assign them to IT / admin roles.
 *
 * Usage:
 *   node scripts/sync-roadmap-permissions.mjs           # production only
 *   node scripts/sync-roadmap-permissions.mjs --demo    # production + caalm-demo
 */

import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const PROD_DB = process.env.PROD_APPWRITE_DATABASE_ID || "685ed87c0009d8189fc7";
const DEMO_DB = "caalm-demo";
const PERMISSIONS_TABLE =
	process.env.NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION || "685ed87c0009d8189fc8";
const ROLE_PERMISSIONS_TABLE = "role_permissions";

const ENDPOINT = (
	process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1"
).replace(/\/$/, "");
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const API_KEY = process.env.NEXT_APPWRITE_API_KEY;

const INCLUDE_DEMO = process.argv.includes("--demo");

const ROADMAP_PERMISSIONS = [
	{
		$id: "perm_it_view_roadmap",
		key: "it.view_roadmap",
		name: "View CLM Roadmap",
		category: "it",
		description: "View the in-app CLM completion roadmap and progress",
	},
	{
		$id: "perm_it_manage_roadmap",
		key: "it.manage_roadmap",
		name: "Manage CLM Roadmap",
		category: "it",
		description:
			"Start roadmap tasks and bind branches/PRs (cannot force-complete)",
	},
];

const ROLE_IDS = ["role_it_staff", "role_super_admin", "role_org_admin"];

if (!PROJECT || !API_KEY) {
	console.error("Missing NEXT_PUBLIC_APPWRITE_PROJECT or NEXT_APPWRITE_API_KEY");
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

async function upsertPermission(databaseId, permission) {
	const existing = await getRow(databaseId, PERMISSIONS_TABLE, permission.$id);
	if (existing) {
		console.log(`  permission exists: ${permission.key}`);
		return permission.$id;
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
		},
	});
	console.log(`  created permission: ${permission.key}`);
	return permission.$id;
}

async function roleHasPermission(databaseId, roleId, permissionId) {
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
	const qLimit = encodeURIComponent(JSON.stringify({ method: "limit", values: [1] }));
	const result = await appwrite(
		`/tablesdb/${databaseId}/tables/${ROLE_PERMISSIONS_TABLE}/rows?queries[]=${qRole}&queries[]=${qPerm}&queries[]=${qLimit}`,
	);
	return (result.total ?? result.rows?.length ?? 0) > 0;
}

async function assignRolePermission(databaseId, roleId, permissionId) {
	if (await roleHasPermission(databaseId, roleId, permissionId)) {
		console.log(`  mapping exists: ${roleId} -> ${permissionId}`);
		return;
	}

	const rowId = `rp_${roleId}_${permissionId}`.slice(0, 36);
	await appwrite(`/tablesdb/${databaseId}/tables/${ROLE_PERMISSIONS_TABLE}/rows`, {
		method: "POST",
		body: {
			rowId,
			data: { roleId, permissionId },
		},
	});
	console.log(`  assigned: ${roleId} -> ${permissionId}`);
}

async function syncDatabase(databaseId) {
	console.log(`\nDatabase: ${databaseId}`);

	for (const permission of ROADMAP_PERMISSIONS) {
		const permissionId = await upsertPermission(databaseId, permission);
		for (const roleId of ROLE_IDS) {
			await assignRolePermission(databaseId, roleId, permissionId);
		}
	}
}

async function main() {
	console.log("Syncing CLM roadmap permissions…");
	await syncDatabase(PROD_DB);
	if (INCLUDE_DEMO) {
		await syncDatabase(DEMO_DB);
	}
	console.log("\nDone.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
