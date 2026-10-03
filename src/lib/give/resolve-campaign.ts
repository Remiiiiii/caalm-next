import { listCampaigns } from "@/lib/campaigns/repository";
import { matchCampaignIdFromShareTag } from "@/lib/give/attribution";

/** Load org campaigns and return $id only when exactly one name slug matches. */
export async function resolveCampaignIdFromShareTag(
	orgId: string,
	shareCampaign: string | undefined,
): Promise<string | undefined> {
	if (!shareCampaign?.trim()) return undefined;
	const campaigns = await listCampaigns(orgId);
	return matchCampaignIdFromShareTag(campaigns, shareCampaign);
}
