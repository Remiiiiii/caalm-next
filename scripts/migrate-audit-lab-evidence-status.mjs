#!/usr/bin/env node
/**
 * Rewrite legacy evidence statuses to §10 enums, then optionally drop legacy
 * enum elements by recreating the status column (Appwrite cannot shrink enums
 * in place reliably — we keep legacy values listed until dry-run is clean).
 *
 *   node scripts/migrate-audit-lab-evidence-status.mjs
 *   node scripts/migrate-audit-lab-evidence-status.mjs --apply
 *   node scripts/migrate-audit-lab-evidence-status.mjs --apply --demo
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
const TABLE = "69c4b201001f4e8c2106";

const MAP = {
	follow_up: "follow_up_requested",
	rejected: "rejected_resubmit",
};

if (!PROJECT || !API_KEY || !PROD_DB) {
	console.error("Missing Appwrite env");
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
			`${method} ${pathname} (${res.status}): ${json.message || text}`,
		);
	}
	return json;
}

async function migrateDb(databaseId) {
	console.log(`\n${databaseId} (${APPLY ? "APPLY" : "dry-run"})`);
	let total = 0;
	let cursor;
	for (;;) {
		const queries = [
			JSON.stringify({ method: "limit", values: [100] }),
			JSON.stringify({ method: "orderAsc", attribute: "$id" }),
		];
		if (cursor) {
			queries.push(
				JSON.stringify({ method: "cursorAfter", values: [cursor] }),
			);
		}
		const page = await appwrite(
			`/tablesdb/${databaseId}/tables/${TABLE}/rows?${queries.map((q) => `queries[]=${encodeURIComponent(q)}`).join("&")}`,
		);
		const rows = page.rows || page.documents || [];
		if (rows.length === 0) break;
		for (const row of rows) {
			const next = MAP[row.status];
			if (!next) continue;
			total += 1;
			console.log(`  ${row.$id}: ${row.status} -> ${next}`);
			if (!APPLY) continue;
			await appwrite(
				`/tablesdb/${databaseId}/tables/${TABLE}/rows/${row.$id}`,
				{ method: "PATCH", body: { data: { status: next } } },
			);
		}
		cursor = rows[rows.length - 1].$id;
		if (rows.length < 100) break;
	}
	console.log(`  rows needing migrate: ${total}`);
}

await migrateDb(PROD_DB);
if (INCLUDE_DEMO) await migrateDb(DEMO_DB);
console.log(APPLY ? "\nDone." : "\nDry run only. Re-run with --apply.");
