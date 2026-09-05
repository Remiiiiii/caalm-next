import { hubspotConnector } from "./connectors/hubspot.connector";
import { updateCrmIntegration } from "./integrations.repository";
import type { CrmIntegrationRecord, CrmTokens } from "./types";
import { parseCrmTokens } from "./types";

export function calculateTokenExpiry(expiresIn: number): Date {
	return new Date(Date.now() + expiresIn * 1000);
}

export function isTokenExpired(
	expiryDate: Date | string | undefined,
	bufferMinutes = 5,
): boolean {
	if (!expiryDate) return true;
	const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
	if (Number.isNaN(expiry.getTime())) return true;
	return expiry.getTime() <= Date.now() + bufferMinutes * 60 * 1000;
}

export async function getFreshHubSpotAccessToken(
	integration: CrmIntegrationRecord,
): Promise<string> {
	const tokens = parseCrmTokens(integration.tokens_json);
	if (!tokens?.access_token) {
		throw new Error("HubSpot is not connected. Reconnect in Settings → Integrations.");
	}

	if (!isTokenExpired(integration.token_expiry) || !tokens.refresh_token) {
		return tokens.access_token;
	}

	const refreshed = await hubspotConnector.refreshTokens(tokens.refresh_token);
	const next: CrmTokens = {
		access_token: refreshed.access_token,
		refresh_token: refreshed.refresh_token || tokens.refresh_token,
		expires_in: refreshed.expires_in,
	};
	await updateCrmIntegration(integration.$id, {
		tokens_json: JSON.stringify(next),
		token_expiry: calculateTokenExpiry(next.expires_in).toISOString(),
		status: "connected",
		last_error: "",
	});
	return next.access_token;
}
