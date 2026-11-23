#!/usr/bin/env node
/**
 * Provision Audit Lab Appwrite tables (prod + optional demo).
 *
 *   node scripts/provision-audit-lab-schema.mjs
 *   node scripts/provision-audit-lab-schema.mjs --apply
 *   node scripts/provision-audit-lab-schema.mjs --apply --demo
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
if (!PROD_DB) {
	console.error(
		"Missing NEXT_PUBLIC_APPWRITE_DATABASE or PROD_APPWRITE_DATABASE_ID",
	);
	process.exit(1);
}
const DEMO_DB = "caalm-demo";

const TABLES = [
	{
		tableId: "69c4b201001f4e8c2101",
		name: "review_simulations",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "title", type: "string", size: 256, required: true },
			{ key: "department", type: "string", size: 256, required: true },
			{ key: "framework", type: "string", size: 64, required: false },
			{ key: "scheduledAt", type: "string", size: 64, required: false },
			{ key: "durationMinutes", type: "integer", required: true },
			{
				key: "status",
				type: "enum",
				elements: [
					"draft",
					"scheduled",
					"prep",
					"in_progress",
					"completed",
					"report_ready",
					"archived",
					"cancelled",
				],
				required: true,
			},
			{ key: "participantsJson", type: "string", size: 16384, required: true },
			{ key: "prepDeadlineAt", type: "string", size: 64, required: false },
			{ key: "recurrence", type: "string", size: 64, required: false },
			{ key: "departmentsJson", type: "string", size: 4000, required: false },
			{ key: "timezone", type: "string", size: 64, required: false },
			{ key: "readinessSnapshotId", type: "string", size: 64, required: false },
			{
				key: "practiceReadinessPct",
				type: "integer",
				required: false,
				min: 0,
				max: 100,
			},
			{ key: "linkedAuditDocIds", type: "string", size: 4000, required: false },
			{ key: "auditTrailJson", type: "string", size: 8000, required: false },
			{ key: "calendarEventId", type: "string", size: 64, required: false },
			{
				key: "aiBannerDismissedSignature",
				type: "string",
				size: 64,
				required: false,
			},
			{ key: "createdByUserId", type: "string", size: 64, required: true },
		],
		indexes: [
			{ key: "orgId_status", type: "key", attributes: ["orgId", "status"] },
		],
	},
	{
		tableId: "69c4b201001f4e8c2102",
		name: "review_questions",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: true },
			{ key: "prompt", type: "string", size: 5000, required: true },
			{ key: "source", type: "string", size: 64, required: true },
			{ key: "sourceFindingId", type: "string", size: 64, required: false },
			{ key: "difficulty", type: "string", size: 32, required: true },
			{ key: "rubric", type: "string", size: 2000, required: false },
			{ key: "controlRef", type: "string", size: 32, required: false },
			{ key: "createdByUserId", type: "string", size: 64, required: true },
		],
		indexes: [
			{
				key: "orgId_sessionId",
				type: "key",
				attributes: ["orgId", "sessionId"],
			},
		],
	},
	{
		tableId: "69c4b201001f4e8c2103",
		name: "review_scripts",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: true },
			{ key: "version", type: "integer", required: true },
			{ key: "itemsJson", type: "string", size: 16384, required: true },
			{ key: "createdByUserId", type: "string", size: 64, required: true },
		],
		indexes: [
			{
				key: "orgId_sessionId",
				type: "key",
				attributes: ["orgId", "sessionId"],
			},
		],
	},
	{
		tableId: "69c4b201001f4e8c2104",
		name: "review_attempts",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: true },
			{ key: "intervieweeUserId", type: "string", size: 64, required: true },
			{ key: "persona", type: "string", size: 64, required: true },
			{ key: "difficulty", type: "string", size: 32, required: true },
			{ key: "transcriptJson", type: "string", size: 16384, required: true },
			{ key: "scoresJson", type: "string", size: 16384, required: true },
			{ key: "status", type: "string", size: 32, required: true },
			{ key: "callId", type: "string", size: 64, required: false },
			{ key: "recordingUrl", type: "string", size: 512, required: false },
			{ key: "consentAt", type: "string", size: 64, required: false },
			{ key: "egressId", type: "string", size: 128, required: false },
			{ key: "recordingFileId", type: "string", size: 64, required: false },
			{
				key: "transcriptRedactedJson",
				type: "longtext",
				required: false,
			},
			{
				key: "dataResidencyRegion",
				type: "string",
				size: 32,
				required: false,
			},
			{ key: "audioAnonymized", type: "boolean", required: false },
			{ key: "createdByUserId", type: "string", size: 64, required: true },
			{ key: "currentQuestionId", type: "string", size: 64, required: false },
			{ key: "pausedAt", type: "string", size: 64, required: false },
		],
		indexes: [
			{
				key: "orgId_sessionId",
				type: "key",
				attributes: ["orgId", "sessionId"],
			},
		],
	},
	{
		tableId: "69c4b201001f4e8c2105",
		name: "review_gaps",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: true },
			{ key: "attemptId", type: "string", size: 64, required: false },
			{ key: "description", type: "string", size: 2000, required: true },
			{ key: "capId", type: "string", size: 64, required: false },
			{ key: "status", type: "string", size: 32, required: true },
		],
		indexes: [
			{
				key: "orgId_sessionId",
				type: "key",
				attributes: ["orgId", "sessionId"],
			},
		],
	},
	{
		tableId: "69c4b201001f4e8c2106",
		name: "evidence_requests",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: true },
			{ key: "title", type: "string", size: 256, required: true },
			{ key: "controlRef", type: "string", size: 64, required: false },
			{ key: "department", type: "string", size: 256, required: false },
			{ key: "ownerUserId", type: "string", size: 64, required: false },
			{ key: "managerUserId", type: "string", size: 64, required: false },
			{ key: "assigneeUserId", type: "string", size: 64, required: false },
			{
				key: "status",
				type: "enum",
				elements: [
					"not_started",
					"in_progress",
					"internal_review",
					"submitted",
					"follow_up_requested",
					"resubmitted",
					"accepted",
					"rejected_resubmit",
					"not_applicable",
				],
				required: true,
			},
			{ key: "dueAt", type: "string", size: 64, required: false },
			{ key: "sensitive", type: "boolean", required: false },
		],
		indexes: [
			{
				key: "orgId_sessionId",
				type: "key",
				attributes: ["orgId", "sessionId"],
			},
			{ key: "orgId_status", type: "key", attributes: ["orgId", "status"] },
		],
	},
	{
		tableId: "69c4b201001f4e8c2107",
		name: "evidence_status_log",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "requestId", type: "string", size: 64, required: true },
			{ key: "fromStatus", type: "string", size: 32, required: false },
			{ key: "toStatus", type: "string", size: 32, required: true },
			{ key: "actorUserId", type: "string", size: 64, required: true },
			{ key: "note", type: "string", size: 2000, required: false },
		],
		indexes: [
			{
				key: "orgId_requestId",
				type: "key",
				attributes: ["orgId", "requestId"],
			},
		],
	},
	{
		tableId: "69c4b201001f4e8c2108",
		name: "review_reports",
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: false },
			{ key: "kind", type: "string", size: 32, required: true },
			{ key: "bodyJson", type: "string", size: 16384, required: true },
			{ key: "createdByUserId", type: "string", size: 64, required: true },
		],
		indexes: [
			{ key: "orgId_kind", type: "key", attributes: ["orgId", "kind"] },
		],
	},
	{
		tableId: "69c4b201001f4e8c2109",
		name: "review_session_participants",
		rowSecurity: true,
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: true },
			{ key: "attemptId", type: "string", size: 64, required: true },
			{ key: "userId", type: "string", size: 64, required: true },
			{ key: "name", type: "string", size: 256, required: false },
			{ key: "email", type: "string", size: 256, required: false },
			{
				key: "role",
				type: "enum",
				elements: ["facilitator", "mock_auditor", "interviewee", "observer"],
				required: true,
			},
			{
				key: "connectionState",
				type: "enum",
				elements: ["invited", "joined", "left"],
				required: true,
			},
			{ key: "micOn", type: "boolean", required: false },
			{ key: "camOn", type: "boolean", required: false },
			{ key: "joinedAt", type: "string", size: 64, required: false },
			{ key: "leftAt", type: "string", size: 64, required: false },
		],
		indexes: [
			{
				key: "orgId_attemptId",
				type: "key",
				attributes: ["orgId", "attemptId"],
			},
			{
				key: "attemptId_userId",
				type: "unique",
				attributes: ["attemptId", "userId"],
			},
		],
	},
	{
		tableId: "69c4b201001f4e8c210a",
		name: "review_transcript_turns",
		rowSecurity: true,
		columns: [
			{ key: "orgId", type: "string", size: 64, required: true },
			{ key: "sessionId", type: "string", size: 64, required: true },
			{ key: "attemptId", type: "string", size: 64, required: true },
			{ key: "questionId", type: "string", size: 64, required: false },
			{ key: "question", type: "string", size: 2000, required: false },
			{ key: "answer", type: "longtext", required: false },
			{ key: "citedEvidence", type: "string", size: 2000, required: false },
			{
				key: "answerQuality",
				type: "enum",
				elements: ["strong", "adequate", "weak"],
				required: false,
			},
			{ key: "at", type: "string", size: 64, required: true },
			{ key: "redacted", type: "boolean", required: false },
			// Attachment entries share this table with spoken turns (one ordered log, one
			// realtime subscription); old rows have no `kind` and are treated as "turn".
			{
				key: "kind",
				type: "enum",
				elements: ["turn", "attachment"],
				required: false,
			},
			{ key: "fileId", type: "string", size: 64, required: false },
			{ key: "fileName", type: "string", size: 512, required: false },
			{ key: "mimeType", type: "string", size: 128, required: false },
			{ key: "fileSize", type: "integer", required: false },
			{ key: "uploaderName", type: "string", size: 128, required: false },
			{
				key: "source",
				type: "enum",
				elements: ["stage_drop", "rubric_item", "floating_widget"],
				required: false,
			},
			{ key: "replyToText", type: "string", size: 2000, required: false },
			{
				key: "attachmentStatus",
				type: "enum",
				elements: ["uploading", "scanning", "attached", "failed"],
				required: false,
			},
			{ key: "progressPct", type: "integer", required: false, min: 0, max: 100 },
			{ key: "failureReason", type: "string", size: 500, required: false },
		],
		indexes: [
			{
				key: "orgId_attemptId",
				type: "key",
				attributes: ["orgId", "attemptId"],
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
		throw new Error(`${method} ${pathname} failed (${res.status}): ${message}`);
	}
	return json;
}

async function createTable(databaseId, table) {
	await appwrite(`/tablesdb/${databaseId}/tables`, {
		method: "POST",
		body: {
			tableId: table.tableId,
			name: table.name,
			permissions: table.rowSecurity
				? ['create("users")']
				: [
						'read("users")',
						'create("users")',
						'update("users")',
						'delete("users")',
					],
			rowSecurity: Boolean(table.rowSecurity),
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
	} else if (col.type === "integer") {
		await appwrite(`${base}/integer`, {
			method: "POST",
			body: { key: col.key, required: col.required, array: false },
		});
	} else if (col.type === "boolean") {
		const body = { key: col.key, required: col.required, array: false };
		if (!col.required) body.default = false;
		await appwrite(`${base}/boolean`, { method: "POST", body });
	} else if (col.type === "longtext") {
		await appwrite(`${base}/longtext`, {
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
	try {
		await appwrite(`/tablesdb/${databaseId}/tables/${tableId}/indexes`, {
			method: "POST",
			body: { key: index.key, type: index.type, columns },
		});
	} catch {
		await appwrite(`/databases/${databaseId}/collections/${tableId}/indexes`, {
			method: "POST",
			body: { key: index.key, type: index.type, attributes: columns },
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
if (INCLUDE_DEMO) await provisionDatabase(DEMO_DB);

console.log(
	APPLY
		? "\nDone. Config fallbacks already use 69c4b201001f4e8c2101–210a."
		: "\nDry run only. Re-run with --apply to create tables.",
);
