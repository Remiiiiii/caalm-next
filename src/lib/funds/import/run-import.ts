import type { NetAssetClass } from "@/lib/funds/constants";
import { createFund, listFundsForOrg } from "@/lib/funds/repository";
import type { OrgFund } from "@/lib/funds/types";
import type { MappedFundImportRow } from "./parse";

export type FundImportDryRunRow =
	| { rowNumber: number; action: "create"; code: string; name: string; netAssetClass: string }
	| { rowNumber: number; action: "skip"; code: string; reason: string };

export type FundImportDryRunResult = {
	rows: FundImportDryRunRow[];
	counts: {
		create: number;
		skip: number;
	};
};

export type FundImportCommitResult = {
	created: OrgFund[];
	skipped: { code: string; reason: string }[];
};

export async function dryRunFundImport(
	orgId: string,
	rows: MappedFundImportRow[],
): Promise<FundImportDryRunResult> {
	const existing = await listFundsForOrg(orgId);
	const codes = new Set(existing.map((f) => f.code.toUpperCase()));
	const seenInFile = new Set<string>();

	const plans: FundImportDryRunRow[] = [];
	let create = 0;
	let skip = 0;

	for (const row of rows) {
		const codeKey = row.code.trim().toUpperCase();
		if (seenInFile.has(codeKey)) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "skip",
				code: row.code,
				reason: "Duplicate fund code in this file",
			});
			skip += 1;
			continue;
		}
		seenInFile.add(codeKey);

		if (codes.has(codeKey)) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "skip",
				code: row.code,
				reason: "Fund code already exists in CAALM",
			});
			skip += 1;
			continue;
		}

		plans.push({
			rowNumber: row.rowNumber,
			action: "create",
			code: row.code,
			name: row.name,
			netAssetClass: row.netAssetClass,
		});
		create += 1;
	}

	return { rows: plans, counts: { create, skip } };
}

export async function commitFundImport(
	orgId: string,
	rows: MappedFundImportRow[],
): Promise<FundImportCommitResult> {
	const dry = await dryRunFundImport(orgId, rows);
	const toCreate = dry.rows.filter((r) => r.action === "create") as Extract<
		FundImportDryRunRow,
		{ action: "create" }
	>[];

	const created: OrgFund[] = [];
	const skipped = dry.rows
		.filter((r) => r.action === "skip")
		.map((r) => ({ code: r.code, reason: r.reason }));

	for (const plan of toCreate) {
		const fund = await createFund({
			orgId,
			code: plan.code,
			name: plan.name,
			netAssetClass: plan.netAssetClass as NetAssetClass,
		});
		created.push(fund);
	}

	return { created, skipped };
}
