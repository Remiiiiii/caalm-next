import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { assertCanCreateContract } from "@/lib/billing/planLimits";
import { createOriginLink, findOriginLink } from "./origin-links.repository";
import type { CrmDealSnapshot, CrmProvider } from "./types";
import { crmReferenceFor } from "./types";

export type CrmDraftPayload = {
	contractName: string;
	orgId: string;
	amount?: number;
	currencyCode: string;
	lifecycleStatus: "draft";
	status: "pending-review";
	description: string;
	contractOwnerId: string;
	vendor?: string;
	contractType: "other";
	priority: "High" | "Medium";
	crmReference: string;
};

export function mapDealToDraftPayload(input: {
	deal: CrmDealSnapshot;
	orgId: string;
	ownerId: string;
}): CrmDraftPayload {
	const { deal, orgId, ownerId } = input;
	const crmReference = crmReferenceFor(deal.provider, deal.externalId);
	const descriptionParts = [
		`Spawned from ${deal.provider === "hubspot" ? "HubSpot" : "Salesforce"} deal "${deal.name}".`,
		deal.amount != null ? `Estimated value: ${deal.currency} ${deal.amount}.` : null,
		deal.companyName ? `Company: ${deal.companyName}.` : null,
		deal.ownerName ? `CRM owner: ${deal.ownerName}.` : null,
		`CRM reference: ${crmReference}.`,
	].filter(Boolean);

	return {
		contractName: deal.name.slice(0, 256),
		orgId,
		amount: deal.amount ?? undefined,
		currencyCode: deal.currency || "USD",
		lifecycleStatus: "draft",
		status: "pending-review",
		description: descriptionParts.join(" ").slice(0, 5000),
		contractOwnerId: ownerId,
		vendor: deal.companyName || undefined,
		contractType: "other",
		priority: (deal.amount ?? 0) >= 50000 ? "High" : "Medium",
		crmReference,
	};
}

export type CreateDraftFromDealResult = {
	contractId: string;
	alreadyLinked: boolean;
	payload: CrmDraftPayload;
};

export async function createDraftFromCrmDeal(input: {
	orgId: string;
	ownerId: string;
	deal: CrmDealSnapshot;
	provider?: CrmProvider;
}): Promise<CreateDraftFromDealResult> {
	const provider = input.provider || input.deal.provider;
	const existing = await findOriginLink({
		orgId: input.orgId,
		provider,
		externalId: input.deal.externalId,
	});
	const payload = mapDealToDraftPayload({
		deal: input.deal,
		orgId: input.orgId,
		ownerId: input.ownerId,
	});

	if (existing?.contract_id) {
		return {
			contractId: existing.contract_id,
			alreadyLinked: true,
			payload,
		};
	}

	await assertCanCreateContract(input.orgId);

	const { tablesDB } = await createAdminClient();
	const contractId = ID.unique();
	const data: Record<string, unknown> = {
		contractName: payload.contractName,
		orgId: payload.orgId,
		amount: payload.amount,
		currencyCode: payload.currencyCode,
		lifecycleStatus: payload.lifecycleStatus,
		status: payload.status,
		description: payload.description,
		contractOwnerId: payload.contractOwnerId,
		vendor: payload.vendor,
		contractType: payload.contractType,
		priority: payload.priority,
	};

	await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "",
		tableId: appwriteConfig.contractsCollectionId || "test-contracts",
		rowId: contractId,
		data,
	});

	await createOriginLink({
		orgId: input.orgId,
		provider,
		externalId: input.deal.externalId,
		contractId,
	});

	return { contractId, alreadyLinked: false, payload };
}
