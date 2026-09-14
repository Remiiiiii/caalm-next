import { describe, expect, it } from "vitest";
import {
	inferObligationKind,
	type KeyObligationMigrationDeps,
	legacyObligationRowId,
	migrateKeyObligationsForOrg,
	normalizeKeyObligationEntries,
	planLegacyObligations,
	splitObligationText,
} from "@/lib/funding/migrate-key-obligations.service";

describe("normalizeKeyObligationEntries", () => {
	it("trims array items and drops empties", () => {
		expect(
			normalizeKeyObligationEntries(["  Quarterly report  ", "", "  "]),
		).toEqual(["Quarterly report"]);
	});

	it("parses a JSON array string", () => {
		expect(
			normalizeKeyObligationEntries(
				'["Submit deliverable","Renewal checklist"]',
			),
		).toEqual(["Submit deliverable", "Renewal checklist"]);
	});

	it("splits comma-separated text", () => {
		expect(normalizeKeyObligationEntries("Pay invoice, File report")).toEqual([
			"Pay invoice",
			"File report",
		]);
	});

	it("returns empty for nullish values", () => {
		expect(normalizeKeyObligationEntries(undefined)).toEqual([]);
		expect(normalizeKeyObligationEntries(null)).toEqual([]);
		expect(normalizeKeyObligationEntries("")).toEqual([]);
	});
});

describe("splitObligationText", () => {
	it("uses the first line as title and the rest as description", () => {
		expect(
			splitObligationText("File quarterly report\nDue each Q-end"),
		).toEqual({
			title: "File quarterly report",
			description: "Due each Q-end",
		});
	});

	it("caps a single-line title at 256 characters", () => {
		const long = "x".repeat(300);
		const result = splitObligationText(long);
		expect(result.title).toHaveLength(256);
		expect(result.description).toHaveLength(44);
	});
});

describe("inferObligationKind", () => {
	it("maps reporting language", () => {
		expect(inferObligationKind("File quarterly report")).toBe("reporting");
	});

	it("maps deliverable language", () => {
		expect(inferObligationKind("Submit milestone package")).toBe("deliverable");
	});

	it("maps renewal language", () => {
		expect(inferObligationKind("Complete renewal checklist")).toBe("renewal");
	});

	it("maps compliance language", () => {
		expect(inferObligationKind("HIPAA audit packet")).toBe("compliance");
	});

	it("maps payment language", () => {
		expect(inferObligationKind("Send invoice and remittance")).toBe("payment");
	});

	it("falls back to other", () => {
		expect(inferObligationKind("Keep copies on file")).toBe("other");
	});
});

describe("legacyObligationRowId", () => {
	const base = {
		orgId: "org-1",
		contractId: "ctr-1",
		entryIndex: 0,
		normalizedText: "File quarterly report",
	};

	it("is stable for the same inputs", () => {
		expect(legacyObligationRowId(base)).toBe(legacyObligationRowId(base));
	});

	it("changes when the text changes", () => {
		expect(legacyObligationRowId(base)).not.toBe(
			legacyObligationRowId({ ...base, normalizedText: "File annual report" }),
		);
	});

	it("is a 36-character alphanumeric Appwrite id", () => {
		expect(legacyObligationRowId(base)).toMatch(/^[a-z0-9]{36}$/);
	});
});

describe("planLegacyObligations", () => {
	it("sets renewalLinked when kind is renewal", () => {
		const planned = planLegacyObligations({
			orgId: "org-1",
			contractId: "ctr-1",
			contractName: "Grant 2026",
			ownerName: "Jordan Lee",
			keyObligations: ["Renewal checklist"],
		});
		expect(planned).toHaveLength(1);
		expect(planned[0].kind).toBe("renewal");
		expect(planned[0].renewalLinked).toBe(true);
		expect(planned[0].title).toBe("Renewal checklist");
		expect(planned[0].ownerName).toBe("Jordan Lee");
	});
});

describe("migrateKeyObligationsForOrg", () => {
	it("returns dry-run parity counts without writing", async () => {
		const existing = new Set<string>();
		const createdIds: string[] = [];
		const deps: KeyObligationMigrationDeps = {
			listContracts: async () => [
				{
					$id: "ctr-1",
					contractName: "Grant 2026",
					ownerName: "Jordan Lee",
					keyObligations: ["File quarterly report", "Send invoice"],
				},
				{ $id: "ctr-2", keyObligations: [] },
			],
			obligationExists: async (rowId) => existing.has(rowId),
			createObligationWithId: async (rowId) => {
				createdIds.push(rowId);
				existing.add(rowId);
				return { created: true };
			},
		};

		const stats = await migrateKeyObligationsForOrg(
			{ orgId: "org-1", actorUserId: "user-1", dryRun: true },
			deps,
		);

		expect(stats).toEqual({
			dryRun: true,
			orgId: "org-1",
			contractsScanned: 2,
			contractsWithLegacy: 1,
			legacyEntries: 2,
			wouldCreate: 2,
			created: 0,
			skipped: 0,
			errors: 0,
		});
		expect(createdIds).toEqual([]);
	});

	it("skips rows that already exist on apply", async () => {
		const planned = planLegacyObligations({
			orgId: "org-1",
			contractId: "ctr-1",
			keyObligations: ["File quarterly report", "Send invoice"],
		});
		const existing = new Set<string>([planned[0].rowId]);
		const createdIds: string[] = [];
		const deps: KeyObligationMigrationDeps = {
			listContracts: async () => [
				{
					$id: "ctr-1",
					keyObligations: ["File quarterly report", "Send invoice"],
				},
			],
			obligationExists: async (rowId) => existing.has(rowId),
			createObligationWithId: async (rowId) => {
				createdIds.push(rowId);
				existing.add(rowId);
				return { created: true };
			},
		};

		const stats = await migrateKeyObligationsForOrg(
			{ orgId: "org-1", actorUserId: "user-1", dryRun: false },
			deps,
		);

		expect(stats.legacyEntries).toBe(2);
		expect(stats.skipped).toBe(1);
		expect(stats.created).toBe(1);
		expect(createdIds).toEqual([planned[1].rowId]);
	});
});
