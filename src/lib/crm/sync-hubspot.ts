import { hubspotConnector } from "./connectors/hubspot.connector";
import { createDraftFromCrmDeal } from "./create-draft-from-deal";
import { updateCrmIntegration } from "./integrations.repository";
import { getFreshHubSpotAccessToken } from "./tokens";
import type { CrmIntegrationRecord } from "./types";
import { parseCrmConfig } from "./types";

export async function syncHubSpotDeals(input: {
	orgId: string;
	ownerId: string;
	integration: CrmIntegrationRecord;
}): Promise<{ created: number; reused: number; skipped: number }> {
	const config = parseCrmConfig(input.integration.config_json);
	if (!config.enabled || !config.triggerStageId) {
		throw new Error("Pick a HubSpot pipeline and trigger stage before syncing.");
	}

	const accessToken = await getFreshHubSpotAccessToken(input.integration);
	const deals = await hubspotConnector.searchDealsByStage(
		accessToken,
		config.pipelineId,
		config.triggerStageId,
	);

	let created = 0;
	let reused = 0;
	for (const deal of deals) {
		if (!deal.externalId) continue;
		const result = await createDraftFromCrmDeal({
			orgId: input.orgId,
			ownerId: input.ownerId,
			deal,
			provider: "hubspot",
		});
		if (result.alreadyLinked) reused += 1;
		else created += 1;
	}

	await updateCrmIntegration(input.integration.$id, {
		last_sync_at: new Date().toISOString(),
		last_error: "",
		status: "connected",
	});

	return { created, reused, skipped: 0 };
}

export async function ingestHubSpotDeal(input: {
	orgId: string;
	ownerId: string;
	integration: CrmIntegrationRecord;
	dealId: string;
	stageId?: string;
}): Promise<{ created: boolean; contractId: string } | { skipped: true }> {
	const config = parseCrmConfig(input.integration.config_json);
	if (!config.enabled || !config.triggerStageId) {
		return { skipped: true };
	}
	if (input.stageId && input.stageId !== config.triggerStageId) {
		return { skipped: true };
	}

	const accessToken = await getFreshHubSpotAccessToken(input.integration);
	const deal = await hubspotConnector.getDeal(accessToken, input.dealId);
	if (deal.stageId && deal.stageId !== config.triggerStageId) {
		return { skipped: true };
	}

	const result = await createDraftFromCrmDeal({
		orgId: input.orgId,
		ownerId: input.ownerId,
		deal,
		provider: "hubspot",
	});
	await updateCrmIntegration(input.integration.$id, {
		last_sync_at: new Date().toISOString(),
		last_error: "",
		status: "connected",
	});
	return { created: !result.alreadyLinked, contractId: result.contractId };
}
