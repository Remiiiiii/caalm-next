import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getAppUrl } from "@/lib/config/environment";
import { hubspotConnector } from "@/lib/crm/connectors/hubspot.connector";
import { calculateTokenExpiry } from "@/lib/crm/tokens";
import {
	getCrmIntegration,
	upsertCrmIntegration,
} from "@/lib/crm/integrations.repository";
import { defaultCrmIntegrationConfig } from "@/lib/crm/types";

function redirectToIntegrations(query: string): NextResponse {
	return NextResponse.redirect(
		`${getAppUrl()}/settings/billing?tab=integrations&${query}`,
	);
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	const error = searchParams.get("error");

	if (error) {
		return redirectToIntegrations(`hubspot=oauth_error`);
	}
	if (!code || !state) {
		return redirectToIntegrations("hubspot=missing_parameters");
	}

	const cookieStore = await cookies();
	const storedState = cookieStore.get("hubspot-oauth-state")?.value;
	if (!storedState || storedState !== state) {
		return redirectToIntegrations("hubspot=invalid_state");
	}
	cookieStore.delete("hubspot-oauth-state");

	const user = await getCurrentUser();
	if (!user) {
		return redirectToIntegrations("hubspot=no_session");
	}

	const parts = state.split("|");
	const orgId = parts[1];
	if (!orgId) {
		return redirectToIntegrations("hubspot=invalid_state");
	}

	try {
		const tokens = await hubspotConnector.exchangeCode(code);
		const existing = await getCrmIntegration(orgId, "hubspot");
		const config = existing
			? undefined
			: defaultCrmIntegrationConfig();

		await upsertCrmIntegration({
			orgId,
			provider: "hubspot",
			status: "connected",
			tokens: {
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				expires_in: tokens.expires_in,
			},
			tokenExpiry: calculateTokenExpiry(tokens.expires_in).toISOString(),
			portalId: tokens.portalId,
			config,
			connectedBy: user.$id,
			lastError: null,
		});

		return redirectToIntegrations("hubspot=connected");
	} catch (callbackError) {
		console.error("[hubspot/callback]", callbackError);
		return redirectToIntegrations("hubspot=callback_failed");
	}
}
