import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig, isAppwriteConfigured } from "@/lib/appwrite/config";
import type {
	Runbook,
	RunbookInput,
	RunbookListFilters,
	RunbookStatus,
	RunbookStorageMode,
	RunbookStep,
} from "./types";

type MemoryBucket = Map<string, Runbook>;

declare global {
	// eslint-disable-next-line no-var
	var __caalmRunbooksMemory: Map<string, MemoryBucket> | undefined;
}

function memoryRoot(): Map<string, MemoryBucket> {
	if (!globalThis.__caalmRunbooksMemory) {
		globalThis.__caalmRunbooksMemory = new Map();
	}
	return globalThis.__caalmRunbooksMemory;
}

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 80);
}

function nowIso() {
	return new Date().toISOString();
}

function parseSteps(raw: unknown): RunbookStep[] {
	if (Array.isArray(raw)) {
		return raw as RunbookStep[];
	}
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw) as RunbookStep[];
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function parseStringArray(raw: unknown): string[] {
	if (Array.isArray(raw)) return raw.map(String);
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) return parsed.map(String);
		} catch {
			return raw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		}
	}
	return [];
}

function rowToRunbook(row: Record<string, unknown>): Runbook {
	return {
		$id: String(row.$id),
		title: String(row.title || ""),
		slug: String(row.slug || ""),
		summary: String(row.summary || ""),
		service: String(row.service || ""),
		severity: (row.severity as Runbook["severity"]) || "medium",
		status: (row.status as RunbookStatus) || "draft",
		symptoms: parseStringArray(row.symptoms),
		steps: parseSteps(row.stepsJson ?? row.steps),
		verification: String(row.verification || ""),
		escalation: String(row.escalation || ""),
		ownerId: String(row.ownerId || ""),
		orgId: String(row.orgId || ""),
		tags: parseStringArray(row.tags),
		integrationKeys: parseStringArray(row.integrationKeys),
		lastReviewedAt: row.lastReviewedAt
			? String(row.lastReviewedAt)
			: undefined,
		$createdAt: String(row.$createdAt || nowIso()),
		$updatedAt: String(row.$updatedAt || nowIso()),
	};
}

function seedForOrg(orgId: string): Runbook[] {
	const ts = nowIso();
	const base = [
		{
			title: "Restore Appwrite availability",
			service: "appwrite",
			severity: "critical" as const,
			symptoms: [
				"API 5xx from Appwrite",
				"Dashboards fail to load records",
				"Uploads stuck pending",
			],
			steps: [
				{
					title: "Confirm blast radius",
					body: "Check whether auth, databases, and storage are all failing or only one service.",
				},
				{
					title: "Check Appwrite status and project keys",
					body: "Verify endpoint, project id, and API key configuration in the environment.",
				},
				{
					title: "Failover / restart path",
					body: "Follow your infra runbook for the Appwrite host or managed service restart.",
				},
				{
					title: "Verify reads and writes",
					body: "Open Contracts and confirm list + a single document read succeed.",
				},
			],
			verification:
				"Contracts list loads and a test notification or note write succeeds.",
			escalation:
				"If unavailable > 15 minutes, page platform lead and open vendor support.",
			integrationKeys: ["pagerduty", "monitoring"],
		},
		{
			title: "Unstick sign-in / 2FA loops",
			service: "auth",
			severity: "high" as const,
			symptoms: [
				"Users bounce between sign-in and settings",
				"Valid authenticator codes rejected",
				"Session cookie missing after login",
			],
			steps: [
				{
					title: "Confirm user completed invite",
					body: "Ensure the account exists and is not deactivated.",
				},
				{
					title: "Check device time",
					body: "TOTP fails when phone clocks drift. Set automatic time.",
				},
				{
					title: "Clear CAALM site cookies and retry",
					body: "Have the user retry in a private window after clearing site data.",
				},
				{
					title: "Supervised 2FA re-enrollment",
					body: "Admin verifies identity, resets second factor per policy, user completes setup immediately.",
				},
			],
			verification: "User can sign in twice in a row with 2FA.",
			escalation: "Escalate to Organization Admin for identity verification.",
			integrationKeys: ["opsgenie"],
		},
		{
			title: "Recover silent notification pipeline",
			service: "notifications",
			severity: "high" as const,
			symptoms: [
				"Expiry widgets show risk but bell stays quiet",
				"Invite emails missing",
				"SMS onboarding not arriving",
			],
			steps: [
				{
					title: "Check source dates and owners",
					body: "Bad metadata creates false silence. Confirm the record date and owner.",
				},
				{
					title: "Inspect notification settings",
					body: "Confirm the affected user did not mute the category.",
				},
				{
					title: "Check provider credentials",
					body: "Verify Mailgun / Twilio / push VAPID configuration.",
				},
				{
					title: "Send a controlled test notice",
					body: "Trigger a known test path and confirm delivery.",
				},
			],
			verification: "A controlled test notification arrives in-app and email/SMS.",
			escalation: "If providers are up but CAALM jobs fail, page IT on-call.",
			integrationKeys: ["monitoring"],
		},
	];

	return base.map((item, index) => ({
		$id: `seed_${orgId}_${index + 1}`,
		title: item.title,
		slug: slugify(item.title),
		summary: item.symptoms[0] || item.title,
		service: item.service,
		severity: item.severity,
		status: "published" as const,
		symptoms: item.symptoms,
		steps: item.steps,
		verification: item.verification,
		escalation: item.escalation,
		ownerId: "system",
		orgId,
		tags: [item.service, "seed"],
		integrationKeys: item.integrationKeys,
		lastReviewedAt: ts,
		$createdAt: ts,
		$updatedAt: ts,
	}));
}

function getMemoryBucket(orgId: string): MemoryBucket {
	const root = memoryRoot();
	let bucket = root.get(orgId);
	if (!bucket) {
		bucket = new Map();
		for (const rb of seedForOrg(orgId)) {
			bucket.set(rb.$id, rb);
		}
		root.set(orgId, bucket);
	}
	return bucket;
}

function preferAppwrite(): boolean {
	return (
		isAppwriteConfigured() &&
		Boolean(appwriteConfig.runbooksCollectionId) &&
		!String(appwriteConfig.runbooksCollectionId).startsWith("test-")
	);
}

function filterList(items: Runbook[], filters: RunbookListFilters): Runbook[] {
	const search = filters.search?.toLowerCase().trim();
	return items.filter((item) => {
		if (filters.service && item.service !== filters.service) return false;
		if (filters.severity && item.severity !== filters.severity) return false;
		if (filters.status && item.status !== filters.status) return false;
		if (!search) return true;
		const hay = [
			item.title,
			item.summary,
			item.service,
			item.slug,
			...item.symptoms,
			...item.tags,
		]
			.join(" ")
			.toLowerCase();
		return hay.includes(search);
	});
}

async function listFromAppwrite(
	orgId: string,
	filters: RunbookListFilters,
): Promise<Runbook[]> {
	const { tablesDB } = await createAdminClient();
	const queries = [
		Query.equal("orgId", orgId),
		Query.orderDesc("$updatedAt"),
		Query.limit(filters.limit || 100),
		Query.offset(filters.offset || 0),
	];
	if (filters.service) queries.push(Query.equal("service", filters.service));
	if (filters.severity)
		queries.push(Query.equal("severity", filters.severity));
	if (filters.status) queries.push(Query.equal("status", filters.status));
	if (filters.search) queries.push(Query.search("title", filters.search));

	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.runbooksCollectionId!,
		queries,
	});

	return (result.rows || []).map((row) =>
		rowToRunbook(row as unknown as Record<string, unknown>),
	);
}

async function createInAppwrite(
	orgId: string,
	ownerId: string,
	input: RunbookInput,
): Promise<Runbook> {
	const { tablesDB } = await createAdminClient();
	const slug = input.slug?.trim() || slugify(input.title);
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.runbooksCollectionId!,
		rowId: ID.unique(),
		data: {
			title: input.title,
			slug,
			summary: input.summary,
			service: input.service,
			severity: input.severity,
			status: input.status || "draft",
			symptoms: input.symptoms,
			stepsJson: JSON.stringify(input.steps),
			verification: input.verification,
			escalation: input.escalation,
			ownerId,
			orgId,
			tags: input.tags || [],
			integrationKeys: input.integrationKeys || [],
			lastReviewedAt: input.lastReviewedAt || nowIso(),
		},
	});
	return rowToRunbook(row as unknown as Record<string, unknown>);
}

export async function listRunbooks(
	orgId: string,
	filters: RunbookListFilters = {},
): Promise<{ items: Runbook[]; storage: RunbookStorageMode }> {
	if (preferAppwrite()) {
		try {
			const items = await listFromAppwrite(orgId, filters);
			return { items, storage: "appwrite" };
		} catch {
			/* fall through to memory */
		}
	}

	const all = Array.from(getMemoryBucket(orgId).values()).sort((a, b) =>
		b.$updatedAt.localeCompare(a.$updatedAt),
	);
	const filtered = filterList(all, filters);
	const offset = filters.offset || 0;
	const limit = filters.limit || 100;
	return {
		items: filtered.slice(offset, offset + limit),
		storage: "memory",
	};
}

export async function getRunbook(
	orgId: string,
	id: string,
): Promise<{ item: Runbook | null; storage: RunbookStorageMode }> {
	if (preferAppwrite()) {
		try {
			const { tablesDB } = await createAdminClient();
			const row = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.runbooksCollectionId!,
				rowId: id,
			});
			const item = rowToRunbook(row as unknown as Record<string, unknown>);
			if (item.orgId && item.orgId !== orgId) {
				return { item: null, storage: "appwrite" };
			}
			return { item, storage: "appwrite" };
		} catch {
			/* fall through */
		}
	}

	return {
		item: getMemoryBucket(orgId).get(id) || null,
		storage: "memory",
	};
}

export async function createRunbook(
	orgId: string,
	ownerId: string,
	input: RunbookInput,
): Promise<{ item: Runbook; storage: RunbookStorageMode }> {
	if (preferAppwrite()) {
		try {
			const item = await createInAppwrite(orgId, ownerId, input);
			return { item, storage: "appwrite" };
		} catch {
			/* fall through */
		}
	}

	const ts = nowIso();
	const item: Runbook = {
		$id: ID.unique(),
		title: input.title,
		slug: input.slug?.trim() || slugify(input.title),
		summary: input.summary,
		service: input.service,
		severity: input.severity,
		status: input.status || "draft",
		symptoms: input.symptoms,
		steps: input.steps,
		verification: input.verification,
		escalation: input.escalation,
		ownerId,
		orgId,
		tags: input.tags || [],
		integrationKeys: input.integrationKeys || [],
		lastReviewedAt: input.lastReviewedAt || ts,
		$createdAt: ts,
		$updatedAt: ts,
	};
	getMemoryBucket(orgId).set(item.$id, item);
	return { item, storage: "memory" };
}

export async function updateRunbook(
	orgId: string,
	id: string,
	input: Partial<RunbookInput>,
): Promise<{ item: Runbook | null; storage: RunbookStorageMode }> {
	if (preferAppwrite()) {
		try {
			const { tablesDB } = await createAdminClient();
			const existing = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.runbooksCollectionId!,
				rowId: id,
			});
			const current = rowToRunbook(
				existing as unknown as Record<string, unknown>,
			);
			if (current.orgId !== orgId) {
				return { item: null, storage: "appwrite" };
			}

			const data: Record<string, unknown> = {};
			if (input.title !== undefined) data.title = input.title;
			if (input.slug !== undefined) data.slug = input.slug;
			if (input.summary !== undefined) data.summary = input.summary;
			if (input.service !== undefined) data.service = input.service;
			if (input.severity !== undefined) data.severity = input.severity;
			if (input.status !== undefined) data.status = input.status;
			if (input.symptoms !== undefined) data.symptoms = input.symptoms;
			if (input.steps !== undefined) data.stepsJson = JSON.stringify(input.steps);
			if (input.verification !== undefined)
				data.verification = input.verification;
			if (input.escalation !== undefined) data.escalation = input.escalation;
			if (input.tags !== undefined) data.tags = input.tags;
			if (input.integrationKeys !== undefined)
				data.integrationKeys = input.integrationKeys;
			if (input.lastReviewedAt !== undefined)
				data.lastReviewedAt = input.lastReviewedAt;

			const row = await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.runbooksCollectionId!,
				rowId: id,
				data,
			});
			return {
				item: rowToRunbook(row as unknown as Record<string, unknown>),
				storage: "appwrite",
			};
		} catch {
			/* fall through */
		}
	}

	const bucket = getMemoryBucket(orgId);
	const current = bucket.get(id);
	if (!current) return { item: null, storage: "memory" };
	const item: Runbook = {
		...current,
		...input,
		symptoms: input.symptoms ?? current.symptoms,
		steps: input.steps ?? current.steps,
		tags: input.tags ?? current.tags,
		integrationKeys: input.integrationKeys ?? current.integrationKeys,
		$updatedAt: nowIso(),
	};
	bucket.set(id, item);
	return { item, storage: "memory" };
}

export async function deleteRunbook(
	orgId: string,
	id: string,
): Promise<{ ok: boolean; storage: RunbookStorageMode }> {
	if (preferAppwrite()) {
		try {
			const existing = await getRunbook(orgId, id);
			if (!existing.item) return { ok: false, storage: "appwrite" };
			const { tablesDB } = await createAdminClient();
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.runbooksCollectionId!,
				rowId: id,
			});
			return { ok: true, storage: "appwrite" };
		} catch {
			/* fall through */
		}
	}

	return {
		ok: getMemoryBucket(orgId).delete(id),
		storage: "memory",
	};
}

export function matchRunbooksForAlert(
	items: Runbook[],
	alert: { service?: string; text?: string },
): Runbook[] {
	const text = (alert.text || "").toLowerCase();
	const service = (alert.service || "").toLowerCase();
	return items
		.filter((rb) => rb.status === "published")
		.map((rb) => {
			let score = 0;
			if (service && rb.service.toLowerCase() === service) score += 10;
			if (text && rb.title.toLowerCase().includes(text)) score += 5;
			for (const symptom of rb.symptoms) {
				if (text && symptom.toLowerCase().includes(text)) score += 3;
				if (text && text.includes(symptom.toLowerCase())) score += 3;
			}
			return { rb, score };
		})
		.filter((x) => x.score > 0)
		.sort((a, b) => b.score - a.score)
		.map((x) => x.rb);
}
