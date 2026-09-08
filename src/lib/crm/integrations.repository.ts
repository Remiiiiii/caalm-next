import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	CrmIntegrationConfig,
	CrmIntegrationRecord,
	CrmIntegrationStatus,
	CrmProvider,
	CrmTokens,
} from "./types";

function tableId(): string {
	return appwriteConfig.crmIntegrationsCollectionId || "test-crm-integrations";
}

function asRecord(row: unknown): CrmIntegrationRecord {
	return row as CrmIntegrationRecord;
}

export async function getCrmIntegration(
	orgId: string,
	provider: CrmProvider,
): Promise<CrmIntegrationRecord | null> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("provider", provider),
			Query.limit(1),
		],
	});
	return response.rows[0] ? asRecord(response.rows[0]) : null;
}

export async function getCrmIntegrationByPortalId(
	portalId: string,
	provider: CrmProvider = "hubspot",
): Promise<CrmIntegrationRecord | null> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: tableId(),
		queries: [
			Query.equal("provider", provider),
			Query.equal("portal_id", portalId),
			Query.limit(1),
		],
	});
	return response.rows[0] ? asRecord(response.rows[0]) : null;
}

export async function upsertCrmIntegration(input: {
	orgId: string;
	provider: CrmProvider;
	status: CrmIntegrationStatus;
	tokens?: CrmTokens;
	tokenExpiry?: string;
	portalId?: string;
	config?: CrmIntegrationConfig;
	connectedBy?: string;
	lastError?: string | null;
	lastSyncAt?: string | null;
}): Promise<CrmIntegrationRecord> {
	const existing = await getCrmIntegration(input.orgId, input.provider);
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {
		orgId: input.orgId,
		provider: input.provider,
		status: input.status,
	};
	if (input.tokens) {
		data.tokens_json = JSON.stringify(input.tokens);
	}
	if (input.tokenExpiry) data.token_expiry = input.tokenExpiry;
	if (input.portalId) data.portal_id = input.portalId;
	if (input.config) data.config_json = JSON.stringify(input.config);
	if (input.connectedBy) data.connected_by = input.connectedBy;
	if (input.connectedBy && input.status === "connected") {
		data.connected_at = new Date().toISOString();
	}
	if (input.lastError !== undefined) data.last_error = input.lastError || "";
	if (input.lastSyncAt !== undefined) {
		data.last_sync_at = input.lastSyncAt || undefined;
	}

	if (existing?.$id) {
		const updated = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "",
			tableId: tableId(),
			rowId: existing.$id,
			data,
		});
		return asRecord(updated);
	}

	const created = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "",
		tableId: tableId(),
		rowId: ID.unique(),
		data,
	});
	return asRecord(created);
}

export async function updateCrmIntegration(
	id: string,
	data: Record<string, unknown>,
): Promise<CrmIntegrationRecord> {
	const { tablesDB } = await createAdminClient();
	const updated = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId || "",
		tableId: tableId(),
		rowId: id,
		data,
	});
	return asRecord(updated);
}

export async function disconnectCrmIntegration(
	orgId: string,
	provider: CrmProvider,
): Promise<void> {
	const existing = await getCrmIntegration(orgId, provider);
	if (!existing?.$id) return;
	await updateCrmIntegration(existing.$id, {
		status: "disconnected",
		tokens_json: "",
		token_expiry: undefined,
		last_error: "",
	});
}
