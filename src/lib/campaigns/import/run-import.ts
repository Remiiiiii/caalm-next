import { createCampaign, listCampaigns } from "@/lib/campaigns";
import type { MappedCampaignImportRow } from "./parse";

export type CampaignImportPlanRow =
	| { rowNumber: number; action: "create"; name: string }
	| { rowNumber: number; action: "skip"; reason: string };

export async function dryRunCampaignImport(
	orgId: string,
	rows: MappedCampaignImportRow[],
): Promise<{
	rows: CampaignImportPlanRow[];
	counts: { create: number; skip: number };
}> {
	const existing = await listCampaigns(orgId);
	const names = new Set(existing.map((c) => c.name.trim().toLowerCase()));
	const seen = new Set<string>();
	const plans: CampaignImportPlanRow[] = [];
	let create = 0;
	let skip = 0;
	for (const row of rows) {
		const key = row.name.toLowerCase();
		if (seen.has(key) || names.has(key)) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "skip",
				reason: "Campaign name already exists",
			});
			skip += 1;
			continue;
		}
		seen.add(key);
		plans.push({ rowNumber: row.rowNumber, action: "create", name: row.name });
		create += 1;
	}
	return { rows: plans, counts: { create, skip } };
}

export async function commitCampaignImport(
	orgId: string,
	rows: MappedCampaignImportRow[],
): Promise<{ createdCount: number; skippedCount: number; failedCount: number }> {
	const dry = await dryRunCampaignImport(orgId, rows);
	const toCreate = new Set(
		dry.rows.filter((r) => r.action === "create").map((r) => r.rowNumber),
	);
	let createdCount = 0;
	let failedCount = 0;
	for (const row of rows) {
		if (!toCreate.has(row.rowNumber)) continue;
		try {
			await createCampaign({
				orgId,
				name: row.name,
				goalAmount: row.goalAmount,
				currency: row.currency,
				startDate: row.startDate,
				endDate: row.endDate,
			});
			createdCount += 1;
		} catch (error) {
			failedCount += 1;
			console.error("[campaigns import commit]", error);
		}
	}
	return { createdCount, skippedCount: dry.counts.skip, failedCount };
}
