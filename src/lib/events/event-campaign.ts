import { getCampaignById } from "@/lib/campaigns/repository";

export class EventCampaignValidationError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.name = "EventCampaignValidationError";
		this.status = status;
	}
}

export async function assertCampaignIdForOrg(
	orgId: string,
	campaignId: string | null | undefined,
): Promise<string | undefined> {
	if (!campaignId) return undefined;
	const trimmed = String(campaignId).trim();
	if (!trimmed) return undefined;
	const campaign = await getCampaignById(trimmed, orgId);
	if (!campaign) {
		throw new EventCampaignValidationError(
			"Campaign not found in this organization",
			400,
		);
	}
	return trimmed;
}
