#!/usr/bin/env node
/**
 * Upsert donations.config.* permission rows and assign to Super Admin / Org Admin.
 *
 * Usage:
 *   node scripts/sync-donation-page-permissions.mjs
 *   node scripts/sync-donation-page-permissions.mjs --demo
 */

import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const PROD_DB =
	process.env.PROD_APPWRITE_DATABASE_ID ||
	process.env.NEXT_PUBLIC_APPWRITE_DATABASE;
if (!PROD_DB) {
	console.error(
		"Missing PROD_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_DATABASE",
	);
	process.exit(1);
}
const DEMO_DB = "caalm-demo";
const PERMISSIONS_TABLE =
	process.env.NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION ||
	"685ed87c0009d8189fc8";
const ROLE_PERMISSIONS_TABLE = "role_permissions";

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
	/\/$/,
	"",
);
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const API_KEY =
	process.env.NEXT_APPWRITE_API_KEY || process.env.NEXT_APPWRITE_KEY;
const INCLUDE_DEMO = process.argv.includes("--demo");

const DONATION_PAGE_PERMISSIONS = [
	{
		$id: "perm_donations_config_view",
		key: "donations.config.view",
		name: "View Donation Page Settings",
		category: "donations",
		description:
			"View draft and published donation page config and version history",
	},
	{
		$id: "perm_donations_config_edit",
		key: "donations.config.edit",
		name: "Edit Donation Page Settings",
		category: "donations",
		description:
			"Edit draft donation page config, publish, revert, and preview drafts",
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

async function upsertPermission(databaseId, perm) {
	const existing = await getRow(databaseId, PERMISSIONS_TABLE, perm.$id);
	if (existing) {
		await appwrite(
			`/tablesdb/${databaseId}/tables/${PERMISSIONS_TABLE}/rows/${perm.$id}`,
			{ method: "PATCH", body: { data: perm } },
		);
		console.log(`  updated permission ${perm.key}`);
	} else {
		await appwrite(
			`/tablesdb/${databaseId}/tables/${PERMISSIONS_TABLE}/rows`,
			{
				method: "POST",
				body: { rowId: perm.$id, data: perm },
			},
		);
		console.log(`  created permission ${perm.key}`);
	}
}

async function rolePermissionAlreadyAssigned(databaseId, roleId, permissionId) {
	const result = await appwrite(
		`/tablesdb/${databaseId}/tables/${ROLE_PERMISSIONS_TABLE}/rows?` +
			new URLSearchParams([
				[
					"queries[]",
					JSON.stringify({
						method: "equal",
						attribute: "roleId",
						values: [roleId],
					}),
				],
				[
					"queries[]",
					JSON.stringify({
						method: "equal",
						attribute: "permissionId",
						values: [permissionId],
					}),
				],
				["queries[]", JSON.stringify({ method: "limit", values: [1] })],
			]),
	);
	return (result.total ?? result.rows?.length ?? 0) > 0;
}

async function ensureRolePermission(databaseId, roleId, permissionId, permKey) {
	if (await rolePermissionAlreadyAssigned(databaseId, roleId, permissionId)) {
		console.log(`  already assigned ${permKey} → ${roleId}`);
		return;
	}
	// Appwrite row IDs max 36 chars; keep role+perm abbreviations short
	const roleShort = roleId.replace("role_", "");
	const permShort = permissionId.replace("perm_", "");
	let rowId = `rp_${roleShort}_${permShort}`.slice(0, 36);
	await appwrite(
		`/tablesdb/${databaseId}/tables/${ROLE_PERMISSIONS_TABLE}/rows`,
		{
			method: "POST",
			body: {
				rowId,
				data: { roleId, permissionId },
			},
		},
	);
	console.log(`  assigned ${permKey} → ${roleId}`);
}

async function syncDatabase(databaseId, label) {
	console.log(`\n=== ${label} (${databaseId}) ===`);
	for (const perm of DONATION_PAGE_PERMISSIONS) {
		await upsertPermission(databaseId, perm);
	}
	for (const roleId of ROLE_IDS) {
		for (const perm of DONATION_PAGE_PERMISSIONS) {
			await ensureRolePermission(databaseId, roleId, perm.$id, perm.key);
		}
	}
}

await syncDatabase(PROD_DB, "production");
if (INCLUDE_DEMO) {
	await syncDatabase(DEMO_DB, "demo");
}
console.log("\nDone.");
