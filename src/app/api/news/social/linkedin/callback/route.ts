import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config/demo-mode";
import { createNewsFeed } from "@/lib/database/news-feeds";
import { upsertNewsSocialConnection } from "@/lib/database/news-social-connections";
import { exchangeLinkedInCode } from "@/lib/news/social/linkedin-adapter";
import { parseNewsOAuthState } from "@/lib/news/social/oauth-state";

export async function GET(request: NextRequest) {
	if (isDemoMode()) {
		return NextResponse.json(
			{ error: "Social connect is disabled in demo mode" },
			{ status: 403 },
		);
	}
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const linkedInError = url.searchParams.get("error");
	const cookieStore = await cookies();
	const cookieState = cookieStore.get("news-linkedin-oauth-state")?.value;
	const parsed = parseNewsOAuthState(state || cookieState);
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const redirectBase = `${appUrl}/dashboard/content-creator?tab=sources`;

	// LinkedIn sent the user back with an OAuth denial / scope failure
	if (linkedInError) {
		console.error(
			"[linkedin-oauth] LinkedIn returned error:",
			linkedInError,
			url.searchParams.get("error_description"),
		);
		return NextResponse.redirect(
			`${redirectBase}&error=linkedin_denied`,
		);
	}

	if (!code || !parsed || parsed.provider !== "linkedin") {
		console.error("[linkedin-oauth] Missing code or invalid/expired state", {
			hasCode: Boolean(code),
			hasParsed: Boolean(parsed),
			provider: parsed?.provider,
		});
		return NextResponse.redirect(`${redirectBase}&error=linkedin_state`);
	}
	try {
		const tokens = await exchangeLinkedInCode(code);
		const connection = await upsertNewsSocialConnection({
			orgId: parsed.orgId,
			provider: "linkedin",
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			expiresAt: tokens.expiresAt,
			connectedBy: parsed.userId,
		});
		await createNewsFeed({
			orgId: parsed.orgId,
			name: "LinkedIn",
			type: "linkedin",
			socialConnectionId: connection.$id,
		});
		cookieStore.delete("news-linkedin-oauth-state");
		return NextResponse.redirect(`${redirectBase}&connected=linkedin`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[linkedin-oauth] Connect failed:", message);
		const codeName = message.includes("token exchange")
			? "linkedin_token"
			: message.includes("not configured")
				? "linkedin_not_configured"
				: message.includes("NEWS_OAUTH_ENCRYPTION_KEY") ||
						message.includes("encrypted")
					? "linkedin_crypto"
					: "linkedin_save";
		return NextResponse.redirect(`${redirectBase}&error=${codeName}`);
	}
}
