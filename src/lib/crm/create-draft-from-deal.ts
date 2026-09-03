import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { assertCanCreateContract } from "@/lib/billing/planLimits";
import { createOriginLink, findOriginLink } from "./origin-links.repository";
import type { CrmDealSnapshot, CrmProvider } from "./types";
import { crmReferenceFor } from "./types";

/** Appwrite Contracts.contractType enum value (capital O). */
const CRM_DEFAULT_CONTRACT_TYPE = "Other";
/** Appwrite Contracts.department enum — Sales fits HubSpot-origin deals. */
const CRM_DEFAULT_DEPARTMENT = "Sales";

export type CrmDraftPayload = {
	contractName: string;
	orgId: string;
	amount: number;
	currencyCode: string;
	lifecycleStatus: "draft";
	status: "pending-review";
	description: string;
	contractOwnerId: string;
	vendor?: string;
	contractType: typeof CRM_DEFAULT_CONTRACT_TYPE;
	department: typeof CRM_DEFAULT_DEPARTMENT;
	priority: "High" | "Medium";
	crmReference: string;
	/** Required on Contracts rows — from HubSpot close date when present. */
	contractExpiryDate: string;
	/** Required on Contracts rows — generated from CRM deal id. */
	contractNumber: string;
};

/** Stable contract number for HubSpot/Salesforce-origin drafts (max 50 chars). */
export function buildCrmContractNumber(
	provider: CrmProvider,
	externalId: string,
): string {
	const prefix = provider === "hubspot" ? "HS" : "SF";
	const id = String(externalId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
	return `${prefix}-${id}`.slice(0, 50);
}

/** HubSpot close dates are often ms timestamps; Appwrite needs an ISO datetime. */
export function resolveContractExpiryDate(
	closeDate: string | null | undefined,
): string {
	if (closeDate?.trim()) {
		const raw = closeDate.trim();
		const asNumber = Number(raw);
		if (Number.isFinite(asNumber) && asNumber > 1_000_000_000) {
			// Seconds vs milliseconds — HubSpot uses ms
			const ms = asNumber < 1_000_000_000_000 ? asNumber * 1000 : asNumber;
			const fromTs = new Date(ms);
			if (!Number.isNaN(fromTs.getTime())) return fromTs.toISOString();
		}
		const parsed = new Date(raw);
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
	}

	// Fallback so required contractExpiryDate never blocks CRM draft create
	const fallback = new Date();
	fallback.setUTCDate(fallback.getUTCDate() + 90);
	fallback.setUTCHours(12, 0, 0, 0);
	return fallback.toISOString();
}

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
		contractName: deal.name.slice(0, 255),
		orgId,
		amount: deal.amount ?? 0,
		currencyCode: deal.currency || "USD",
		lifecycleStatus: "draft",
		status: "pending-review",
		description: descriptionParts.join(" ").slice(0, 5000),
		contractOwnerId: ownerId,
		vendor: deal.companyName ? deal.companyName.slice(0, 50) : undefined,
		contractType: CRM_DEFAULT_CONTRACT_TYPE,
		department: CRM_DEFAULT_DEPARTMENT,
		priority: (deal.amount ?? 0) >= 50000 ? "High" : "Medium",
		crmReference,
		contractExpiryDate: resolveContractExpiryDate(deal.closeDate),
		contractNumber: buildCrmContractNumber(deal.provider, deal.externalId),
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
		contractNumber: payload.contractNumber,
		orgId: payload.orgId,
		amount: payload.amount,
		currencyCode: payload.currencyCode,
		lifecycleStatus: payload.lifecycleStatus,
		status: payload.status,
		description: payload.description,
		contractOwnerId: payload.contractOwnerId,
		vendor: payload.vendor,
		contractType: payload.contractType,
		department: payload.department,
		priority: payload.priority,
		contractExpiryDate: payload.contractExpiryDate,
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
