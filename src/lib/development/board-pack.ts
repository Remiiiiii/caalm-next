import { listCampaigns } from "@/lib/campaigns/repository";
import { computeCampaignRoi } from "@/lib/development/metrics";
import { sumPostedGiftTotalForCampaign } from "@/lib/gifts/repository";
import type { DevelopmentMetrics } from "./metrics";
import { formatRetentionPercent } from "./metrics";

export type CampaignRoiRow = {
	campaignId: string;
	name: string;
	postedTotal: number;
	campaignCost?: number;
	roi: number | null;
};

export function rankCampaignsByRoi(rows: CampaignRoiRow[], limit = 5): CampaignRoiRow[] {
	return [...rows]
		.filter((row) => row.roi != null)
		.sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
		.slice(0, limit);
}

export function buildBoardPackCsv(
	metrics: DevelopmentMetrics,
	campaigns: CampaignRoiRow[],
): string {
	const escape = (value: string | number) => {
		const raw = String(value);
		if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
		return raw;
	};
	const lines = [
		"section,metric,value",
		`kpis,year,${metrics.year}`,
		`kpis,ytd_dollars,${metrics.ytdDollars}`,
		`kpis,unique_donors_ytd,${metrics.uniqueDonorsYtd}`,
		`kpis,retention_pct,${escape(formatRetentionPercent(metrics.retentionRate))}`,
		`kpis,new_donors_ytd,${metrics.newDonorsYtd}`,
	];
	for (const row of campaigns) {
		const roiLabel =
			row.roi == null ? "—" : `${Math.round(row.roi * 1000) / 10}%`;
		lines.push(
			`campaign,${escape(row.campaignId)},${escape(row.name)},${row.postedTotal},${row.campaignCost ?? ""},${escape(roiLabel)}`,
		);
	}
	return `${lines.join("\n")}\n`;
}

/** Live board pack rows — no mock flags. */
export async function loadBoardPackCampaigns(
	orgId: string,
	limit = 5,
): Promise<CampaignRoiRow[]> {
	const campaigns = await listCampaigns(orgId);
	const rows: CampaignRoiRow[] = [];
	for (const campaign of campaigns) {
		const postedTotal = await sumPostedGiftTotalForCampaign(
			orgId,
			campaign.$id,
		);
		rows.push({
			campaignId: campaign.$id,
			name: campaign.name,
			postedTotal,
			campaignCost: campaign.campaignCost,
			roi: computeCampaignRoi(postedTotal, campaign.campaignCost),
		});
	}
	return rankCampaignsByRoi(rows, limit);
}
