"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	calculateTokenExpiry,
	isTokenExpired,
	refreshAccessToken,
} from "@/lib/microsoft/oauth";

export interface OutlookMailIntegration {
	$id?: string;
	user_id: string;
	email?: string;
	tokens_json?: string;
	token_expiry?: string;
	status?: string;
	scopes?: string;
	last_error?: string;
	connected_at?: string;
	access_token?: string;
	refresh_token?: string;
}

export interface UpsertOutlookMailIntegrationData {
	user_id: string;
	email: string;
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scopes?: string;
}

function parseTokens(
	integration: OutlookMailIntegration,
): OutlookMailIntegration {
	if (integration.tokens_json) {
		try {
			const tokens = JSON.parse(integration.tokens_json) as {
				access_token: string;
				refresh_token: string;
			};
			integration.access_token = tokens.access_token;
			integration.refresh_token = tokens.refresh_token;
		} catch {
			// leave tokens unset
		}
	}
	return integration;
}

export async function getOutlookMailIntegration(
	userId: string,
): Promise<OutlookMailIntegration | null> {
	try {
		const adminClient = await createAdminClient();
		const response = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.outlookMailIntegrationsCollectionId!,
			queries: [Query.equal("user_id", userId), Query.limit(1)],
		});

		if (response.rows.length === 0) return null;
		return parseTokens(
			response.rows[0] as unknown as OutlookMailIntegration,
		);
	} catch (error) {
		console.error("[SERVER] getOutlookMailIntegration:", error);
		return null;
	}
}

export async function upsertOutlookMailIntegration(
	data: UpsertOutlookMailIntegrationData,
): Promise<OutlookMailIntegration> {
	const adminClient = await createAdminClient();
	const tokenExpiry = calculateTokenExpiry(data.expires_in).toISOString();
	const tokensJson = JSON.stringify({
		access_token: data.access_token,
		refresh_token: data.refresh_token,
	});

	const rowData = {
		user_id: data.user_id,
		email: data.email,
		tokens_json: tokensJson,
		token_expiry: tokenExpiry,
		status: "connected",
		scopes: data.scopes || "",
		last_error: "",
		connected_at: new Date().toISOString(),
	};

	const existing = await getOutlookMailIntegration(data.user_id);
	if (existing?.$id) {
		const updated = await adminClient.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.outlookMailIntegrationsCollectionId!,
			rowId: existing.$id,
			data: rowData,
		});
		return parseTokens(updated as unknown as OutlookMailIntegration);
	}

	const created = await adminClient.tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.outlookMailIntegrationsCollectionId!,
		rowId: ID.unique(),
		data: rowData,
	});
	return parseTokens(created as unknown as OutlookMailIntegration);
}

async function persistTokens(
	integrationId: string,
	accessToken: string,
	refreshToken: string,
	expiresIn: number,
): Promise<void> {
	const adminClient = await createAdminClient();
	const tokensJson = JSON.stringify({
		access_token: accessToken,
		refresh_token: refreshToken,
	});
	await adminClient.tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.outlookMailIntegrationsCollectionId!,
		rowId: integrationId,
		data: {
			tokens_json: tokensJson,
			token_expiry: calculateTokenExpiry(expiresIn).toISOString(),
			status: "connected",
			last_error: "",
		},
	});
}

export async function getValidOutlookMailAccessToken(
	userId: string,
): Promise<{ accessToken: string; email: string } | null> {
	const integration = await getOutlookMailIntegration(userId);
	if (!integration?.$id || integration.status === "disconnected") {
		return null;
	}

	parseTokens(integration);
	if (!integration.access_token) return null;

	const expiry = integration.token_expiry
		? new Date(integration.token_expiry)
		: new Date(0);

	if (!isTokenExpired(expiry) || !integration.refresh_token) {
		return {
			accessToken: integration.access_token,
			email: integration.email || "",
		};
	}

	try {
		const refreshed = await refreshAccessToken(integration.refresh_token);
		const refreshToken =
			refreshed.refresh_token || integration.refresh_token;
		await persistTokens(
			integration.$id,
			refreshed.access_token,
			refreshToken,
			refreshed.expires_in,
		);
		return {
			accessToken: refreshed.access_token,
			email: integration.email || "",
		};
	} catch (error) {
		console.error("[SERVER] Outlook mail token refresh failed:", error);
		const adminClient = await createAdminClient();
		await adminClient.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.outlookMailIntegrationsCollectionId!,
			rowId: integration.$id,
			data: {
				status: "error",
				last_error:
					error instanceof Error ? error.message : "Token refresh failed",
			},
		});
		return null;
	}
}

export async function deleteOutlookMailIntegration(
	integrationId: string,
): Promise<void> {
	const adminClient = await createAdminClient();
	await adminClient.tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.outlookMailIntegrationsCollectionId!,
		rowId: integrationId,
	});
}

export async function getOutlookMailIntegrationStatus(
	userId: string,
): Promise<{
	connected: boolean;
	email?: string;
	status?: string;
	lastError?: string;
}> {
	const integration = await getOutlookMailIntegration(userId);
	if (!integration || integration.status === "disconnected") {
		return { connected: false };
	}
	return {
		connected: integration.status === "connected",
		email: integration.email,
		status: integration.status,
		lastError: integration.last_error || undefined,
	};
}
