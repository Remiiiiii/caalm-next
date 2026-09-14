import { createHash } from "node:crypto";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	type CreateObligationInput,
	createObligationWithId,
	getObligationById,
} from "./obligation.repository";
import type { ObligationKind } from "./types";

export const OBLIGATION_TITLE_MAX = 256;
export const OBLIGATION_DESCRIPTION_MAX = 5000;

const CONTRACT_PAGE_SIZE = 100;
const PROD_DATABASE_ID = "685ed87c0009d8189fc7";

type ContractRow = {
	$id: string;
	contractName?: string;
	name?: string;
	ownerName?: string;
	keyObligations?: unknown;
};

export type PlannedLegacyObligation = {
	rowId: string;
	contractId: string;
	contractName?: string;
	title: string;
	description?: string;
	kind: ObligationKind;
	renewalLinked: boolean;
	ownerName?: string;
};

export type KeyObligationMigrationStats = {
	dryRun: boolean;
	orgId: string;
	contractsScanned: number;
	contractsWithLegacy: number;
	legacyEntries: number;
	wouldCreate: number;
	created: number;
	skipped: number;
	errors: number;
};

export type KeyObligationMigrationDeps = {
	listContracts: (orgId: string) => Promise<ContractRow[]>;
	obligationExists: (rowId: string) => Promise<boolean>;
	createObligationWithId: (
		rowId: string,
		input: CreateObligationInput,
	) => Promise<{ created: boolean }>;
};

const KIND_RULES: Array<{ kind: ObligationKind; pattern: RegExp }> = [
	{
		kind: "renewal",
		pattern:
			/\brenew(al|ing|s)?\b|\bauto-?renew|\bextend(s|ed|ing|sion)?\b|\bchecklist\b/i,
	},
	{
		kind: "reporting",
		pattern: /\breport(s|ing|ed)?\b|\bquarterly\b|\bannual report\b/i,
	},
	{
		kind: "deliverable",
		pattern: /\bdeliverable(s)?\b|\bmilestone(s)?\b|\bdeliver(y|ed|ing)\b/i,
	},
	{
		kind: "compliance",
		pattern:
			/\bcomplian(ce|t)\b|\baudit(s|ing)?\b|\bregulator(y|ion)\b|\bhipaa\b|\bcertif/i,
	},
	{
		kind: "payment",
		pattern: /\bpayment(s)?\b|\binvoice(s|d)?\b|\bpayable\b|\bremittance\b/i,
	},
];

/** Trim, drop empties, and accept array / JSON / comma-separated shapes. */
export function normalizeKeyObligationEntries(raw: unknown): string[] {
	if (raw == null) return [];
	if (Array.isArray(raw)) {
		return raw
			.map((item) =>
				typeof item === "string" ? item.trim() : String(item ?? "").trim(),
			)
			.filter((item) => item.length > 0);
	}
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith("[")) {
			try {
				const parsed = JSON.parse(trimmed) as unknown;
				if (Array.isArray(parsed)) {
					return normalizeKeyObligationEntries(parsed);
				}
			} catch {
				// Fall through to comma-separated parsing.
			}
		}
		return trimmed
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
	return [];
}

/** First line (capped at 256) is the title; leftover text is description. */
export function splitObligationText(entry: string): {
	title: string;
	description?: string;
} {
	const trimmed = entry.trim();
	const newline = trimmed.indexOf("\n");
	let title: string;
	let rest: string;
	if (newline === -1) {
		title = trimmed.slice(0, OBLIGATION_TITLE_MAX);
		rest = trimmed.slice(OBLIGATION_TITLE_MAX).trim();
	} else {
		const firstLine = trimmed.slice(0, newline).trim();
		if (firstLine.length <= OBLIGATION_TITLE_MAX) {
			title = firstLine;
			rest = trimmed.slice(newline + 1).trim();
		} else {
			title = firstLine.slice(0, OBLIGATION_TITLE_MAX);
			rest =
				`${firstLine.slice(OBLIGATION_TITLE_MAX)}\n${trimmed.slice(newline + 1)}`.trim();
		}
	}
	if (!title) {
		title = trimmed.slice(0, OBLIGATION_TITLE_MAX) || "Untitled obligation";
	}
	const description = rest
		? rest.slice(0, OBLIGATION_DESCRIPTION_MAX)
		: undefined;
	return { title, description };
}

export function inferObligationKind(
	title: string,
	description?: string,
): ObligationKind {
	const text = `${title} ${description || ""}`;
	for (const rule of KIND_RULES) {
		if (rule.pattern.test(text)) return rule.kind;
	}
	return "other";
}

function isRenewalLinked(kind: ObligationKind, title: string): boolean {
	return kind === "renewal" || /\brenewal\s+checklist\b/i.test(title);
}

/** Appwrite-safe 36-char alphanumeric id. Same inputs always match. */
export function legacyObligationRowId(input: {
	orgId: string;
	contractId: string;
	entryIndex: number;
	normalizedText: string;
}): string {
	const payload = [
		input.orgId,
		input.contractId,
		String(input.entryIndex),
		input.normalizedText,
	].join("\0");
	return createHash("sha256").update(payload).digest("hex").slice(0, 36);
}

export function planLegacyObligations(input: {
	orgId: string;
	contractId: string;
	contractName?: string;
	ownerName?: string;
	keyObligations: unknown;
}): PlannedLegacyObligation[] {
	const entries = normalizeKeyObligationEntries(input.keyObligations);
	return entries.map((normalizedText, entryIndex) => {
		const { title, description } = splitObligationText(normalizedText);
		const kind = inferObligationKind(title, description);
		return {
			rowId: legacyObligationRowId({
				orgId: input.orgId,
				contractId: input.contractId,
				entryIndex,
				normalizedText,
			}),
			contractId: input.contractId,
			contractName: input.contractName,
			title,
			description,
			kind,
			renewalLinked: isRenewalLinked(kind, title),
			ownerName: input.ownerName,
		};
	});
}

async function listContractsForOrg(orgId: string): Promise<ContractRow[]> {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.contractsCollectionId || "test-contracts";
	const databaseId = appwriteConfig.databaseId || "";
	const rows: ContractRow[] = [];
	let offset = 0;

	while (true) {
		const result = await tablesDB.listRows({
			databaseId,
			tableId,
			queries: [
				Query.equal("orgId", orgId),
				Query.limit(CONTRACT_PAGE_SIZE),
				Query.offset(offset),
			],
		});
		const page = (result.rows || []) as unknown as ContractRow[];
		rows.push(...page);
		if (page.length < CONTRACT_PAGE_SIZE) break;
		offset += CONTRACT_PAGE_SIZE;
	}

	return rows;
}

const defaultDeps: KeyObligationMigrationDeps = {
	listContracts: listContractsForOrg,
	obligationExists: async (rowId) => (await getObligationById(rowId)) != null,
	createObligationWithId: async (rowId, input) => {
		const result = await createObligationWithId(rowId, input);
		return { created: result.created };
	},
};

function emptyStats(
	orgId: string,
	dryRun: boolean,
): KeyObligationMigrationStats {
	return {
		dryRun,
		orgId,
		contractsScanned: 0,
		contractsWithLegacy: 0,
		legacyEntries: 0,
		wouldCreate: 0,
		created: 0,
		skipped: 0,
		errors: 0,
	};
}

/**
 * Backfill contract_obligations from Contracts.keyObligations.
 * Does not delete or clear the legacy text arrays.
 *
 * Migrated rows default to status `open`, inferred kind, contract ownerName,
 * and actor as ownerUserId / createdByUserId. renewalLinked is true when the
 * kind is renewal (or the title looks like a renewal checklist).
 */
export async function migrateKeyObligationsForOrg(
	input: {
		orgId: string;
		actorUserId: string;
		dryRun: boolean;
	},
	deps: KeyObligationMigrationDeps = defaultDeps,
): Promise<KeyObligationMigrationStats> {
	const stats = emptyStats(input.orgId, input.dryRun);
	const contracts = await deps.listContracts(input.orgId);
	stats.contractsScanned = contracts.length;

	for (const contract of contracts) {
		const planned = planLegacyObligations({
			orgId: input.orgId,
			contractId: contract.$id,
			contractName: contract.contractName || contract.name,
			ownerName: contract.ownerName,
			keyObligations: contract.keyObligations,
		});
		if (planned.length === 0) continue;

		stats.contractsWithLegacy += 1;
		stats.legacyEntries += planned.length;

		for (const item of planned) {
			try {
				const exists = await deps.obligationExists(item.rowId);
				if (exists) {
					stats.skipped += 1;
					continue;
				}
				if (input.dryRun) {
					stats.wouldCreate += 1;
					continue;
				}
				const created = await deps.createObligationWithId(item.rowId, {
					orgId: input.orgId,
					contractId: item.contractId,
					contractName: item.contractName,
					title: item.title,
					description: item.description,
					kind: item.kind,
					status: "open",
					ownerUserId: input.actorUserId,
					ownerName: item.ownerName,
					renewalLinked: item.renewalLinked,
					createdByUserId: input.actorUserId,
				});
				if (created.created) {
					stats.created += 1;
				} else {
					stats.skipped += 1;
				}
			} catch (error) {
				stats.errors += 1;
				console.error(
					`[funding] migrateKeyObligations: failed ${contract.$id} ${item.rowId}`,
					error,
				);
			}
		}
	}

	return stats;
}

export function assertNotProdDatabaseForDemo(databaseId: string): void {
	if (databaseId === PROD_DATABASE_ID) {
		throw new Error(
			"Refusing --demo: configured database is production (685ed87c0009d8189fc7)",
		);
	}
}
