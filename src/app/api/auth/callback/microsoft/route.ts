import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createCalendarIntegration } from "@/lib/actions/calendar-integration.actions";
import { upsertOutlookMailIntegration } from "@/lib/actions/outlook-mail-integration.actions";
import { getAppUrl } from "@/lib/config/environment";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import {
	calculateTokenExpiry,
	exchangeCodeForTokens,
	getUserInfo,
	MICROSOFT_MAIL_SCOPES,
} from "@/lib/microsoft/oauth";

export async function GET(request: NextRequest) {
	// Hoist purpose so catch still knows mail vs calendar after the purpose cookie is cleared.
	let purpose: "mail" | "calendar" = "calendar";
	const settingsIntegrations = `${getAppUrl()}/settings/billing?tab=integrations`;

	try {
		const { isDemoMode } = await import("@/lib/config/demo-mode");
		if (isDemoMode()) {
			return NextResponse.redirect(
				`${getAppUrl()}/settings/billing?tab=integrations&error=demo_integrations_disabled`,
			);
		}

		const { searchParams } = new URL(request.url);
		const code = searchParams.get("code");
		const state = searchParams.get("state");
		const error = searchParams.get("error");
		const errorDescription = searchParams.get("error_description");

		const cookieStore = await cookies();
		const purposeRaw = cookieStore.get("microsoft-oauth-purpose")?.value || null;
		purpose = purposeRaw === "mail" ? "mail" : "calendar";

		if (error) {
			console.error("Microsoft OAuth error:", error, errorDescription);
			if (purpose === "mail") {
				return NextResponse.redirect(
					`${settingsIntegrations}&outlook_mail=oauth_${error}`,
				);
			}
			return NextResponse.redirect(
				`${
					process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
				}/calendar?error=microsoft_oauth_${error}`,
			);
		}

		if (!code || !state) {
			if (purpose === "mail") {
				return NextResponse.redirect(
					`${settingsIntegrations}&outlook_mail=missing_parameters`,
				);
			}
			return NextResponse.redirect(
				`${
					process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
				}/calendar?error=missing_parameters`,
			);
		}

		const storedState = cookieStore.get("microsoft-oauth-state")?.value;

		if (!storedState || storedState !== state) {
			console.error("Invalid state parameter:", {
				received: state,
				stored: storedState,
			});
			if (purpose === "mail") {
				return NextResponse.redirect(
					`${settingsIntegrations}&outlook_mail=invalid_state`,
				);
			}
			return NextResponse.redirect(
				`${
					process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
				}/calendar?error=invalid_state`,
			);
		}

		cookieStore.delete("microsoft-oauth-state");
		cookieStore.delete("microsoft-oauth-purpose");

		let userId: string;
		try {
			userId = await getCurrentUserId();
		} catch (_authError) {
			if (purpose === "mail") {
				return NextResponse.redirect(
					`${settingsIntegrations}&outlook_mail=no_session`,
				);
			}
			return NextResponse.redirect(`${getAppUrl()}/calendar?error=no_session`);
		}

		const tokens = await exchangeCodeForTokens(code, state);
		const userInfo = await getUserInfo(tokens.access_token);
		const email =
			userInfo.mail || userInfo.userPrincipalName || userInfo.displayName;

		if (purpose === "mail") {
			await upsertOutlookMailIntegration({
				user_id: userId,
				email,
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				expires_in: tokens.expires_in,
				scopes: tokens.scope || MICROSOFT_MAIL_SCOPES,
			});

			return NextResponse.redirect(
				`${settingsIntegrations}&outlook_mail=connected&email=${encodeURIComponent(email)}`,
			);
		}

		const tokenExpiry = calculateTokenExpiry(tokens.expires_in);
		await createCalendarIntegration({
			user_id: userId,
			provider: "microsoft",
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			token_expiry: tokenExpiry.toISOString(),
			sync_enabled: true,
		});

		return NextResponse.redirect(
			`${getAppUrl()}/calendar?success=microsoft_connected&user=${encodeURIComponent(
				userInfo.displayName,
			)}`,
		);
	} catch (error) {
		console.error("Microsoft OAuth callback error:", error);

		let errorMessage = "unknown_error";
		const errText = error instanceof Error ? error.message : "";

		if (errText.includes("invalid_client") || errText.includes("AADSTS7000215")) {
			// Azure: secret value wrong (often Secret ID pasted instead of Secret Value).
			errorMessage = "invalid_client_secret";
		} else if (errText.includes("Token exchange failed")) {
			errorMessage = "token_exchange_failed";
		} else if (errText.includes("Failed to get user info")) {
			errorMessage = "user_info_failed";
		} else if (errText.includes("Error creating calendar integration")) {
			errorMessage = "integration_creation_failed";
		}

		const cookieStore = await cookies();
		cookieStore.delete("microsoft-oauth-purpose");

		if (purpose === "mail") {
			return NextResponse.redirect(
				`${settingsIntegrations}&outlook_mail=callback_${errorMessage}`,
			);
		}

		return NextResponse.redirect(
			`${getAppUrl()}/dashboard?error=microsoft_callback_${errorMessage}`,
		);
	}
}
