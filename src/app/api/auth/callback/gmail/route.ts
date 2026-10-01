import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { upsertGmailIntegration } from "@/lib/actions/gmail-integration.actions";
import { getAppUrl } from "@/lib/config/environment";
import {
	exchangeCodeForTokens,
	getUserInfo,
} from "@/lib/gmail/oauth";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";

function redirectToIntegrations(query: string): NextResponse {
	return NextResponse.redirect(
		`${getAppUrl()}/settings/billing?tab=integrations&${query}`,
	);
}

export async function GET(request: NextRequest) {
	try {
		const { isDemoMode } = await import("@/lib/config/demo-mode");
		if (isDemoMode()) {
			return redirectToIntegrations("error=demo_integrations_disabled");
		}

		const { searchParams } = new URL(request.url);
		const code = searchParams.get("code");
		const state = searchParams.get("state");
		const error = searchParams.get("error");

		if (error) {
			console.error("[SERVER] Gmail OAuth error:", error);
			return redirectToIntegrations(`gmail=oauth_error`);
		}

		if (!code || !state) {
			return redirectToIntegrations("gmail=missing_parameters");
		}

		const cookieStore = await cookies();
		const storedState = cookieStore.get("gmail-oauth-state")?.value;
		if (!storedState || storedState !== state) {
			return redirectToIntegrations("gmail=invalid_state");
		}
		cookieStore.delete("gmail-oauth-state");

		let userId: string;
		try {
			userId = await getCurrentUserId();
		} catch {
			return redirectToIntegrations("gmail=no_session");
		}

		const tokens = await exchangeCodeForTokens(code);
		if (!tokens.refresh_token) {
			console.warn("[SERVER] Gmail connect: no refresh_token returned");
		}

		const profile = await getUserInfo(tokens.access_token);

		await upsertGmailIntegration({
			user_id: userId,
			email: profile.email,
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token || "",
			expires_in: tokens.expires_in,
			scopes: tokens.scope,
		});

		return redirectToIntegrations(
			`gmail=connected&email=${encodeURIComponent(profile.email)}`,
		);
	} catch (callbackError) {
		console.error("[SERVER] Gmail OAuth callback error:", callbackError);
		return redirectToIntegrations("gmail=callback_failed");
	}
}
