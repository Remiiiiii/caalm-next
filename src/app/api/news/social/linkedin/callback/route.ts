import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createNewsFeed } from "@/lib/database/news-feeds";
import { upsertNewsSocialConnection } from "@/lib/database/news-social-connections";
import { exchangeLinkedInCode } from "@/lib/news/social/linkedin-adapter";
import { parseNewsOAuthState } from "@/lib/news/social/oauth-state";

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const cookieStore = await cookies();
	const cookieState = cookieStore.get("news-linkedin-oauth-state")?.value;
	const parsed = parseNewsOAuthState(state || cookieState);
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const redirectBase = `${appUrl}/dashboard/content-creator?tab=sources`;
	if (!code || !parsed || parsed.provider !== "linkedin") {
		return NextResponse.redirect(`${redirectBase}&error=linkedin_oauth`);
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
	} catch {
		return NextResponse.redirect(`${redirectBase}&error=linkedin_oauth`);
	}
}
