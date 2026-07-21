"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	calculateTokenExpiry,
	isTokenExpired,
	refreshAccessToken,
} from "@/lib/microsoft/oauth";

export interface CalendarIntegration {
	$id?: string;
	user_id: string;
	provider: "microsoft" | "google";
	access_token: string;
	refresh_token: string;
	token_expiry: string;
	connected_at: string;
	last_sync?: string;
	sync_enabled: boolean;
	tokens_json?: string; // Added for database storage
	$createdAt?: string;
	$updatedAt?: string;
}

export interface CreateCalendarIntegrationData {
	user_id: string;
	provider: "microsoft" | "google";
	access_token: string;
	refresh_token: string;
	token_expiry: string;
	sync_enabled?: boolean;
}

/**
 * Create a new calendar integration
 */
export const createCalendarIntegration = async (
	data: CreateCalendarIntegrationData,
): Promise<CalendarIntegration> => {
	try {
		const adminClient = await createAdminClient();

		// Store tokens as JSON string to fit within Appwrite's limits
		const tokensJson = JSON.stringify({
			access_token: data.access_token,
			refresh_token: data.refresh_token,
		});

		const integrationData = {
			user_id: data.user_id,
			provider: data.provider,
			tokens_json: tokensJson,
			token_expiry: data.token_expiry,
			connected_at: new Date().toISOString(),
			sync_enabled: data.sync_enabled ?? true,
		};

		const response = await adminClient.tablesDB.createRow(
			appwriteConfig.databaseId!,
			appwriteConfig.calendarIntegrationsCollectionId!,
			ID.unique(),
			integrationData,
		);

		// Tokens are now stored as JSON in the main record

		return response as unknown as CalendarIntegration;
	} catch (error) {
		console.error("Error creating calendar integration:", error);
		throw error;
	}
};

/**
 * Get calendar integration by user ID and provider
 */
export const getCalendarIntegration = async (
	userId: string,
	provider: "microsoft" | "google",
): Promise<CalendarIntegration | null> => {
	try {
		const adminClient = await createAdminClient();

		const response = await adminClient.tablesDB.listRows(
			appwriteConfig.databaseId!,
			appwriteConfig.calendarIntegrationsCollectionId!,
			[
				Query.equal("user_id", userId),
				Query.equal("provider", provider),
				Query.limit(1),
			],
		);

		if (response.rows.length === 0) {
			return null;
		}

		const integration = response.rows[0] as unknown as CalendarIntegration;

		// Parse tokens from JSON field
		try {
			if (integration.tokens_json) {
				const tokens = JSON.parse(integration.tokens_json);
				integration.access_token = tokens.access_token;
				integration.refresh_token = tokens.refresh_token;
			}
		} catch (parseError) {
			console.error("Error parsing tokens JSON:", parseError);
			// Return integration without tokens - will need to re-authenticate
		}

		return integration;
	} catch (error) {
		console.error("Error getting calendar integration:", error);
		throw error;
	}
};

/**
 * Get all calendar integrations for a user
 */
export const getUserCalendarIntegrations = async (
	userId: string,
): Promise<CalendarIntegration[]> => {
	try {
		const adminClient = await createAdminClient();

		const response = await adminClient.tablesDB.listRows(
			appwriteConfig.databaseId!,
			appwriteConfig.calendarIntegrationsCollectionId!,
			[Query.equal("user_id", userId)],
		);

		const integrations = response.rows as unknown as CalendarIntegration[];

		// Parse tokens from JSON field for all integrations
		for (const integration of integrations) {
			try {
				if (integration.tokens_json) {
					const tokens = JSON.parse(integration.tokens_json);
					integration.access_token = tokens.access_token;
					integration.refresh_token = tokens.refresh_token;
				}
			} catch (parseError) {
				console.error(
					"Error parsing tokens JSON for integration:",
					integration.$id,
					parseError,
				);
				// Continue without tokens for this integration
			}
		}

		return integrations;
	} catch (error) {
		console.error("Error getting user calendar integrations:", error);
		throw error;
	}
};

/**
 * Update calendar integration tokens
 */
export const updateCalendarIntegrationTokens = async (
	integrationId: string,
	accessToken: string,
	refreshToken: string,
	expiresIn: number,
): Promise<CalendarIntegration> => {
	try {
		const adminClient = await createAdminClient();

		const tokenExpiry = calculateTokenExpiry(expiresIn).toISOString();

		// Update tokens as JSON in the main integration record
		const tokensJson = JSON.stringify({
			access_token: accessToken,
			refresh_token: refreshToken,
		});

		const response = await adminClient.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.calendarIntegrationsCollectionId!,
			rowId: integrationId,
			data: {
				tokens_json: tokensJson,
				token_expiry: tokenExpiry,
			},
		});

		return response as unknown as CalendarIntegration;
	} catch (error) {
		console.error("Error updating calendar integration tokens:", error);
		throw error;
	}
};

/**
 * Update last sync timestamp
 */
export const updateLastSync = async (
	integrationId: string,
): Promise<CalendarIntegration> => {
	try {
		const adminClient = await createAdminClient();

		const response = await adminClient.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.calendarIntegrationsCollectionId!,
			rowId: integrationId,
			data: {
				last_sync: new Date().toISOString(),
			},
		});

		return response as unknown as CalendarIntegration;
	} catch (error) {
		console.error("Error updating last sync:", error);
		throw error;
	}
};

/**
 * Toggle sync enabled status
 */
export const toggleSyncEnabled = async (
	integrationId: string,
	enabled: boolean,
): Promise<CalendarIntegration> => {
	try {
		const adminClient = await createAdminClient();

		const response = await adminClient.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.calendarIntegrationsCollectionId!,
			rowId: integrationId,
			data: {
				sync_enabled: enabled,
			},
		});

		return response as unknown as CalendarIntegration;
	} catch (error) {
		console.error("Error toggling sync enabled:", error);
		throw error;
	}
};

/**
 * Delete calendar integration
 */
export const deleteCalendarIntegration = async (
	integrationId: string,
): Promise<void> => {
	try {
		const adminClient = await createAdminClient();

		await adminClient.tablesDB.deleteRow(
			appwriteConfig.databaseId!,
			appwriteConfig.calendarIntegrationsCollectionId!,
			integrationId,
		);
	} catch (error) {
		console.error("Error deleting calendar integration:", error);
		throw error;
	}
};

/**
 * Refresh tokens for an integration
 */
export const refreshIntegrationTokens = async (
	integration: CalendarIntegration,
): Promise<CalendarIntegration> => {
	try {
		// Check if token needs refresh
		const tokenExpiry = new Date(integration.token_expiry);
		if (!isTokenExpired(tokenExpiry)) {
			return integration; // Token is still valid
		}

		// Refresh the token
		const tokens = await refreshAccessToken(integration.refresh_token);

		// Update the integration with new tokens
		return await updateCalendarIntegrationTokens(
			integration.$id!,
			tokens.access_token,
			tokens.refresh_token,
			tokens.expires_in,
		);
	} catch (error) {
		console.error("Error refreshing integration tokens:", error);
		throw error;
	}
};

/**
 * Get valid integration with refreshed tokens
 */
export const getValidIntegration = async (
	userId: string,
	provider: "microsoft" | "google",
): Promise<CalendarIntegration | null> => {
	try {
		const integration = await getCalendarIntegration(userId, provider);

		if (!integration) {
			return null;
		}

		// Check if token needs refresh
		const tokenExpiry = new Date(integration.token_expiry);
		if (isTokenExpired(tokenExpiry)) {
			try {
				return await refreshIntegrationTokens(integration);
			} catch (refreshError) {
				console.error(
					"Failed to refresh tokens, integration may need re-authentication:",
					refreshError,
				);
				// Return the integration anyway, let the caller handle the error
				return integration;
			}
		}

		return integration;
	} catch (error) {
		console.error("Error getting valid integration:", error);
		throw error;
	}
};

/**
 * Check if user has active calendar integration
 */
export const hasActiveCalendarIntegration = async (
	userId: string,
	provider: "microsoft" | "google",
): Promise<boolean> => {
	try {
		const integration = await getValidIntegration(userId, provider);
		return integration?.sync_enabled ?? false;
	} catch (error) {
		console.error("Error checking active calendar integration:", error);
		return false;
	}
};

/**
 * Get integration statistics
 */
export const getIntegrationStats = async (
	userId: string,
): Promise<{
	total: number;
	microsoft: boolean;
	google: boolean;
	lastSync?: string;
}> => {
	try {
		const integrations = await getUserCalendarIntegrations(userId);

		const microsoft = integrations.some(
			(i) => i.provider === "microsoft" && i.sync_enabled,
		);
		const google = integrations.some(
			(i) => i.provider === "google" && i.sync_enabled,
		);

		const lastSync = integrations
			.filter((i) => i.last_sync)
			.sort(
				(a, b) =>
					new Date(b.last_sync!).getTime() - new Date(a.last_sync!).getTime(),
			)[0]?.last_sync;

		return {
			total: integrations.length,
			microsoft,
			google,
			lastSync,
		};
	} catch (error) {
		console.error("Error getting integration stats:", error);
		return {
			total: 0,
			microsoft: false,
			google: false,
		};
	}
};

/**
 * Update calendar integration settings (like sync_enabled)
 */
export const updateCalendarIntegration = async (
	userId: string,
	updates: Partial<Pick<CalendarIntegration, "sync_enabled" | "last_sync">>,
): Promise<CalendarIntegration | null> => {
	try {
		const adminClient = await createAdminClient();

		// Find the existing integration
		const response = await adminClient.databases.listDocuments(
			appwriteConfig.databaseId!,
			appwriteConfig.calendarIntegrationsCollectionId!,
			[Query.equal("user_id", userId), Query.equal("provider", "microsoft")],
		);

		if (response.documents.length === 0) {
			console.error("No Microsoft integration found to update");
			return null;
		}

		const integration = response.documents[0];

		// Prepare update data
		const updateData: any = {};
		if (updates.sync_enabled !== undefined) {
			updateData.sync_enabled = updates.sync_enabled;
		}
		if (updates.last_sync !== undefined) {
			updateData.last_sync = updates.last_sync;
		}

		// Update the integration
		const updatedIntegration = await adminClient.databases.updateDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.calendarIntegrationsCollectionId!,
			integration.$id,
			updateData,
		);

		// Parse tokens from stored JSON
		const tokens = JSON.parse(updatedIntegration.tokens || "{}");

		return {
			$id: updatedIntegration.$id,
			user_id: updatedIntegration.user_id,
			provider: updatedIntegration.provider,
			access_token: tokens.access_token || "",
			refresh_token: tokens.refresh_token || "",
			token_expiry: updatedIntegration.token_expiry,
			connected_at: updatedIntegration.connected_at,
			last_sync: updatedIntegration.last_sync,
			sync_enabled: updatedIntegration.sync_enabled,
			$createdAt: updatedIntegration.$createdAt,
			$updatedAt: updatedIntegration.$updatedAt,
		};
	} catch (error) {
		console.error("Error updating calendar integration:", error);
		throw error;
	}
};
