import { listCampaigns } from "@/lib/campaigns/repository";
import { computeCampaignRoi } from "@/lib/development/metrics";
import type { StyledXlsxInput } from "@/lib/export/styled-xlsx";
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

export function rankCampaignsByRoi(
	rows: CampaignRoiRow[],
	limit = 5,
): CampaignRoiRow[] {
	return [...rows]
		.filter((row) => row.roi != null)
		.sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
		.slice(0, limit);
}

export function buildBoardPackXlsxInput(
	metrics: DevelopmentMetrics,
	campaigns: CampaignRoiRow[],
): StyledXlsxInput {
	return {
		sheetName: "Board Pack",
		title: `Development Board Pack — ${metrics.year}`,
		subtitle: "CAALM · Live giving metrics and top campaigns by ROI",
		columns: [
			{ header: "Section", width: 16 },
			{ header: "Metric", width: 38 },
			{ header: "Value", width: 26 },
			{ header: "Posted total", type: "currency", width: 18 },
			{ header: "Campaign cost", type: "currency", width: 18 },
			{ header: "ROI", width: 12 },
		],
		rows: [
			["KPI", "Year", String(metrics.year)],
			["KPI", "Dollars raised year to date", "", metrics.ytdDollars],
			["KPI", "Unique donors year to date", String(metrics.uniqueDonorsYtd)],
			["KPI", "Retention", formatRetentionPercent(metrics.retentionRate)],
			["KPI", "New donors year to date", String(metrics.newDonorsYtd)],
			...campaigns.map((row) => [
				"Campaign",
				row.name,
				row.campaignId,
				row.postedTotal,
				row.campaignCost ?? null,
				row.roi == null ? "—" : `${Math.round(row.roi * 1000) / 10}%`,
			]),
		],
	};
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
