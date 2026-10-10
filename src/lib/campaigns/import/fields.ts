import { guessMappedField } from "@/lib/import/mapping";

export const CAMPAIGN_IMPORT_FIELD_KEYS = [
	"name",
	"goalAmount",
	"currency",
	"startDate",
	"endDate",
] as const;

export type CampaignImportFieldKey = (typeof CAMPAIGN_IMPORT_FIELD_KEYS)[number];

export const CAMPAIGN_IMPORT_FIELD_LABELS: Record<
	CampaignImportFieldKey,
	string
> = {
	name: "Campaign name",
	goalAmount: "Goal amount",
	currency: "Currency",
	startDate: "Start date",
	endDate: "End date",
};

const ALIASES: Record<string, CampaignImportFieldKey> = {
	name: "name",
	campaign: "name",
	campaign_name: "name",
	goal: "goalAmount",
	goal_amount: "goalAmount",
	currency: "currency",
	start: "startDate",
	start_date: "startDate",
	end: "endDate",
	end_date: "endDate",
};

export function guessCampaignImportField(
	header: string,
): CampaignImportFieldKey | "" {
	return guessMappedField(header, CAMPAIGN_IMPORT_FIELD_KEYS, ALIASES);
}

export const CAMPAIGN_IMPORT_SAMPLE_CSV = `name,goal_amount,currency,start_date,end_date
Annual appeal,150000,USD,2026-01-01,2026-12-31
`;
