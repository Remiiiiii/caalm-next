#!/usr/bin/env node
/**
 * Seed a few mock open readiness gaps for a review session, so the Interview
 * Builder's "generate from gaps" feature has something real to work with.
 *
 *   node scripts/seed-mock-readiness-gaps.mjs                  # most recently created session, prod db
 *   node scripts/seed-mock-readiness-gaps.mjs --session=<id>   # specific session
 *   node scripts/seed-mock-readiness-gaps.mjs --demo           # demo db instead of prod
 */

import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const args = process.argv.slice(2);
const sessionArg = args.find((a) => a.startsWith("--session="))?.split("=")[1];
const useDemo = args.includes("--demo");

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
const DATABASE_ID = useDemo ? "caalm-demo" : PROD_DB;

const SESSIONS_TABLE = "69c4b201001f4e8c2101";
const GAPS_TABLE = "69c4b201001f4e8c2105";

if (!PROJECT || !API_KEY || !DATABASE_ID) {
	console.error(
		"Missing NEXT_PUBLIC_APPWRITE_PROJECT / NEXT_APPWRITE_API_KEY / database id in .env.local",
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
		throw new Error(`${method} ${pathname} failed (${res.status}): ${message}`);
	}
	return json;
}

const MOCK_GAPS = [
	"Access reviews for the finance system aren't consistently logged — there's no reliable record of who approved the last quarterly review.",
	"New-hire offboarding doesn't always revoke system access the same day — two recent departures kept access for over a week.",
	"The disaster-recovery runbook hasn't been tested in over a year, so nobody can confirm it still works as written.",
	"Vendor risk assessments are tracked in a shared spreadsheet instead of the system of record, so they're easy to lose track of.",
];

async function main() {
	let session;
	if (sessionArg) {
		session = await appwrite(
			`/tablesdb/${DATABASE_ID}/tables/${SESSIONS_TABLE}/rows/${sessionArg}`,
		);
	} else {
		const list = await appwrite(
			`/tablesdb/${DATABASE_ID}/tables/${SESSIONS_TABLE}/rows`,
		);
		const rows = [...(list.rows ?? [])].sort(
			(a, b) => Date.parse(b.$createdAt) - Date.parse(a.$createdAt),
		);
		session = rows[0];
	}
	if (!session) {
		console.error(
			"No review session found to attach mock gaps to. Create a simulation first, or pass --session=<id>.",
		);
		process.exit(1);
	}

	console.log(
		`Seeding ${MOCK_GAPS.length} mock readiness gaps for session "${session.title}" (${session.$id})`,
	);

	for (const description of MOCK_GAPS) {
		const row = await appwrite(
			`/tablesdb/${DATABASE_ID}/tables/${GAPS_TABLE}/rows`,
			{
				method: "POST",
				body: {
					rowId: "unique()",
					data: {
						orgId: session.orgId,
						sessionId: session.$id,
						description,
						status: "open",
					},
				},
			},
		);
		console.log(`  + ${row.$id} — ${description.slice(0, 60)}...`);
	}

	console.log("Done. Refresh the Interview Builder and try \"generate from gaps\".");
}

main().catch((err) => {
	console.error(err.message || err);
	process.exit(1);
});
